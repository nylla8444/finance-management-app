import React, { createContext, useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import { getCurrencySymbol } from '../utils/currencyUtils';

export const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [assets, setAssets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [currency, setCurrency] = useState('PHP'); // Default currency
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function setupDatabase() {
            try {
                console.log("Opening database...");
                const database = await SQLite.openDatabaseAsync('financialApp.db');
                setDb(database);

                // Initialize database tables one by one
                console.log("Creating assets table...");
                await database.execAsync(
                    'CREATE TABLE IF NOT EXISTS assets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, amount REAL, currency TEXT, image TEXT);'
                );

                console.log("Creating transactions table...");
                await database.execAsync(
                    'CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, amount REAL, category TEXT, description TEXT, location TEXT, date TEXT);'
                );

                console.log("Creating budgets table...");
                await database.execAsync(
                    'CREATE TABLE IF NOT EXISTS budgets (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, amount REAL, period TEXT, spent REAL);'
                );

                // Load initial data
                console.log("Loading initial data...");
                await loadAssets(database);
                await loadTransactions(database);
                await loadBudgets(database);
            } catch (error) {
                console.error('Database setup error:', error);
                setIsLoading(false);
            }
        }

        setupDatabase();
    }, []);

    // Load assets from database
    const loadAssets = async (database) => {
        try {
            const result = await database.getAllAsync('SELECT * FROM assets');
            setAssets(result);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading assets', error);
            setIsLoading(false);
        }
    };

    // Load transactions from database
    const loadTransactions = async (database) => {
        try {
            const result = await database.getAllAsync('SELECT * FROM transactions ORDER BY date DESC');
            setTransactions(result);
        } catch (error) {
            console.error('Error loading transactions', error);
        }
    };

    // Load budgets from database
    const loadBudgets = async (database) => {
        try {
            const result = await database.getAllAsync('SELECT * FROM budgets');
            setBudgets(result);
        } catch (error) {
            console.error('Error loading budgets', error);
        }
    };

    // Add a new asset
    const addAsset = async (asset) => {
        try {
            const result = await db.runAsync(
                'INSERT INTO assets (name, amount, currency, image) VALUES (?, ?, ?, ?)',

                [asset.name, asset.amount, asset.currency, asset.image]
            );
            const newAsset = { ...asset, id: result.lastInsertRowId };
            setAssets([...assets, newAsset]);
        } catch (error) {
            console.error('Error adding asset', error);
        }
    };

    // Update an asset
    const updateAsset = async (asset) => {
        try {
            await db.runAsync(
                'UPDATE assets SET name = ?, amount = ?, currency = ?, image = ? WHERE id = ?',
                [asset.name, asset.amount, asset.currency, asset.image, asset.id]
            );
            setAssets(assets.map(a => a.id === asset.id ? asset : a));
        } catch (error) {
            console.error('Error updating asset', error);
        }
    };

    // Delete an asset
    const deleteAsset = async (id) => {
        try {
            await db.runAsync('DELETE FROM assets WHERE id = ?', [id]);
            setAssets(assets.filter(a => a.id !== id));
        } catch (error) {
            console.error('Error deleting asset', error);
        }
    };

    // Calculate total assets
    const getTotalAssets = () => {
        return assets.reduce((total, asset) => total + parseFloat(asset.amount), 0);
    };

    // Add a new transaction
    const addTransaction = async (transaction) => {
        try {
            const result = await db.runAsync(
                'INSERT INTO transactions (type, amount, category, description, location, date) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    transaction.type,
                    transaction.amount,
                    transaction.category,
                    transaction.description,
                    transaction.location,
                    transaction.date
                ]
            );

            // Update asset amount based on the transaction
            const asset = assets.find(a => a.name === transaction.location);
            if (asset) {
                let newAmount = parseFloat(asset.amount);
                if (transaction.type === 'income') {
                    newAmount += parseFloat(transaction.amount);
                } else {
                    newAmount -= parseFloat(transaction.amount);
                }

                await updateAsset({
                    ...asset,
                    amount: newAmount
                });
            }

            // If it's an expense, update the corresponding budget
            if (transaction.type === 'expense') {
                // Find budgets that match this category
                const matchingBudgets = budgets.filter(b => b.category === transaction.category);

                // Update each matching budget
                for (const budget of matchingBudgets) {
                    const spent = parseFloat(budget.spent || 0) + parseFloat(transaction.amount);
                    await updateBudget({
                        ...budget,
                        spent
                    });
                }
            }

            const newTransaction = { ...transaction, id: result.lastInsertRowId };
            setTransactions([newTransaction, ...transactions]);

        } catch (error) {
            console.error('Error adding transaction', error);
        }
    };

    // Update a transaction
    const updateTransaction = async (transaction) => {
        try {
            await db.runAsync(
                'UPDATE transactions SET type = ?, amount = ?, category = ?, description = ?, location = ?, date = ? WHERE id = ?',
                [
                    transaction.type,
                    transaction.amount,
                    transaction.category,
                    transaction.description,
                    transaction.location,
                    transaction.date,
                    transaction.id
                ]
            );

            // Update the state to reflect the changes
            setTransactions(transactions.map(t =>
                t.id === transaction.id ? transaction : t
            ));

            // Handle asset updates
            // If transaction type or amount has changed, we need to update asset amounts
            const originalTransaction = transactions.find(t => t.id === transaction.id);

            if (originalTransaction) {
                // If location (asset) changed or amount changed, update affected assets
                if (originalTransaction.location !== transaction.location ||
                    originalTransaction.amount !== transaction.amount ||
                    originalTransaction.type !== transaction.type) {

                    // Reverse the effect of the original transaction on the original asset
                    const originalAsset = assets.find(a => a.name === originalTransaction.location);
                    if (originalAsset) {
                        let newAmount = parseFloat(originalAsset.amount);
                        if (originalTransaction.type === 'income') {
                            newAmount -= parseFloat(originalTransaction.amount);
                        } else {
                            newAmount += parseFloat(originalTransaction.amount);
                        }

                        // Apply the new transaction to the new/same asset
                        if (originalTransaction.location === transaction.location) {
                            // Same asset, just add the new amount
                            if (transaction.type === 'income') {
                                newAmount += parseFloat(transaction.amount);
                            } else {
                                newAmount -= parseFloat(transaction.amount);
                            }

                            await updateAsset({
                                ...originalAsset,
                                amount: newAmount
                            });
                        } else {
                            // Different assets affected
                            await updateAsset({
                                ...originalAsset,
                                amount: newAmount
                            });

                            // Update the new asset
                            const newAsset = assets.find(a => a.name === transaction.location);
                            if (newAsset) {
                                let newAssetAmount = parseFloat(newAsset.amount);
                                if (transaction.type === 'income') {
                                    newAssetAmount += parseFloat(transaction.amount);
                                } else {
                                    newAssetAmount -= parseFloat(transaction.amount);
                                }

                                await updateAsset({
                                    ...newAsset,
                                    amount: newAssetAmount
                                });
                            }
                        }
                    }
                }

                // Update budget data if needed
                // If it's an expense and category changed, update budget spent
                if (transaction.type === 'expense') {
                    // If category changed, update both old and new category budgets
                    if (originalTransaction.category !== transaction.category) {
                        // Update old category budget (subtract amount)
                        const oldBudgets = budgets.filter(b => b.category === originalTransaction.category);
                        for (const budget of oldBudgets) {
                            const spent = Math.max(0, parseFloat(budget.spent || 0) - parseFloat(originalTransaction.amount));
                            await updateBudget({
                                ...budget,
                                spent
                            });
                        }

                        // Update new category budget (add amount)
                        const newBudgets = budgets.filter(b => b.category === transaction.category);
                        for (const budget of newBudgets) {
                            const spent = parseFloat(budget.spent || 0) + parseFloat(transaction.amount);
                            await updateBudget({
                                ...budget,
                                spent
                            });
                        }
                    }
                    // If only amount changed, update the budget for that category
                    else if (originalTransaction.amount !== transaction.amount) {
                        const affectedBudgets = budgets.filter(b => b.category === transaction.category);
                        for (const budget of affectedBudgets) {
                            const amountDifference = parseFloat(transaction.amount) - parseFloat(originalTransaction.amount);
                            const spent = parseFloat(budget.spent || 0) + amountDifference;
                            await updateBudget({
                                ...budget,
                                spent: Math.max(0, spent)
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error updating transaction', error);
        }
    };

    // Delete a transaction
    const deleteTransaction = async (id) => {
        try {
            await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
            setTransactions(transactions.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting transaction', error);
        }
    };

    // Add a new budget
    const addBudget = async (budget) => {
        try {
            const result = await db.runAsync(
                'INSERT INTO budgets (category, amount, period, spent) VALUES (?, ?, ?, ?)',
                [budget.category, budget.amount, budget.period, 0]
            );
            const newBudget = { ...budget, id: result.lastInsertRowId };
            setBudgets([...budgets, newBudget]);
        } catch (error) {
            console.error('Error adding budget', error);
        }
    };

    // Update a budget
    const updateBudget = async (budget) => {
        try {
            await db.runAsync(
                'UPDATE budgets SET category = ?, amount = ?, period = ?, spent = ? WHERE id = ?',
                [budget.category, budget.amount, budget.period, budget.spent, budget.id]
            );
            setBudgets(budgets.map(b => b.id === budget.id ? budget : b));
        } catch (error) {
            console.error('Error updating budget', error);
        }
    };

    // Delete a budget
    const deleteBudget = async (id) => {
        try {
            await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
            setBudgets(budgets.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error deleting budget', error);
        }
    };

    // Update budget goal by adjusting all budgets in a period
    const updateBudgetGoal = async (totalAmount, period) => {
        try {
            // Get current total for the period
            const periodBudgets = budgets.filter(b => b.period === period);
            const currentTotal = periodBudgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);

            if (currentTotal === 0) {
                // If there are no budgets yet, create a default "Other" budget
                await addBudget({
                    category: 'Other',
                    amount: totalAmount,
                    period,
                    spent: 0
                });
            } else {
                // Adjust each budget proportionally
                const ratio = totalAmount / currentTotal;

                for (const budget of periodBudgets) {
                    const newAmount = parseFloat(budget.amount) * ratio;
                    await updateBudget({
                        ...budget,
                        amount: newAmount
                    });
                }
            }
        } catch (error) {
            console.error('Error updating budget goal', error);
        }
    };

    // Get total budget for a period
    const getTotalBudget = (period) => {
        return budgets
            .filter(b => b.period === period)
            .reduce((total, b) => total + parseFloat(b.amount), 0);
    };

    // Get remaining budget for a specific budget category
    const getBudgetRemaining = (budgetId) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (!budget) return 0;

        const { category, period, amount } = budget;

        // Calculate start date based on period
        const startDate = getStartDateForPeriod(period);

        // Get expenses for this category in the period
        const expensesInCategory = transactions
            .filter(t =>
                t.type === 'expense' &&
                t.category === category &&
                new Date(t.date) >= startDate
            )
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return parseFloat(amount) - expensesInCategory;
    };

    // Get total remaining budget for a period
    const getTotalRemaining = (period) => {
        const periodBudgets = budgets.filter(b => b.period === period);
        let totalRemaining = 0;

        for (const budget of periodBudgets) {
            totalRemaining += getBudgetRemaining(budget.id);
        }

        return totalRemaining;
    };

    // Helper to get start date for a period
    const getStartDateForPeriod = (period) => {
        const now = new Date();
        switch (period) {
            case 'Weekly':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                return weekStart;
            case 'Monthly':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            case 'Yearly':
                return new Date(now.getFullYear(), 0, 1);
            default:
                return new Date(0);
        }
    };

    // Get transactions filtered by period
    const getTransactionsByPeriod = (period) => {
        const startDate = getStartDateForPeriod(period);
        return transactions.filter(transaction =>
            new Date(transaction.date) >= startDate
        );
    };

    // Function to change currency
    const changeCurrency = (newCurrency) => {
        setCurrency(newCurrency);
    };

    // Function to get currency symbol
    const getCurrency = () => {
        return getCurrencySymbol(currency);
    };

    return (
        <DatabaseContext.Provider
            value={{
                assets,
                transactions,
                budgets,
                currency,
                changeCurrency,
                getCurrency,
                isLoading,
                addAsset,
                updateAsset,
                deleteAsset,
                getTotalAssets,
                addTransaction,
                deleteTransaction,
                addBudget,
                updateBudget,
                deleteBudget,
                updateBudgetGoal,
                getTotalBudget,
                getBudgetRemaining,
                getTotalRemaining,
                getTransactionsByPeriod,
                loadAssets: () => db && loadAssets(db),
                loadTransactions: () => db && loadTransactions(db),
                loadBudgets: () => db && loadBudgets(db),
                db,
                updateTransaction,
            }}
        >
            {children}
        </DatabaseContext.Provider>
    );
};
