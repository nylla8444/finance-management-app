import React, { createContext, useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { sortAssetsByAmount } from '../utils/sortUtils';

export const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [dbInitialized, setDbInitialized] = useState(false);
    const [assets, setAssets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [currency, setCurrency] = useState('PHP'); // Default currency
    const [isLoading, setIsLoading] = useState(true);
    const [initRetries, setInitRetries] = useState(0);
    const [deletedTransactions, setDeletedTransactions] = useState([]); // Track deleted transactions
    const [recentlyDeleted, setRecentlyDeleted] = useState([]); // Track recently deleted transactions
    const [archivedTransactions, setArchivedTransactions] = useState([]);
    const [archiveSettings, setArchiveSettings] = useState({
        autoArchive: true,
        archiveAfterMonths: 12, // Archive transactions older than 12 months
        keepRecentMonths: 3, // Keep last 3 months always loaded
    });
    const MAX_RETRIES = 3;

    // Safely execute database operations with null checks and error handling
    const safeDbOperation = async (operation, errorMessage) => {
        if (!db) {
            console.warn("Database not initialized yet");
            return null;
        }

        try {
            return await operation();
        } catch (error) {
            console.error(`${errorMessage}:`, error);

            // Check if this is a connection error and the database was previously initialized
            if (dbInitialized && error.message &&
                (error.message.includes("NullPointerException") ||
                    error.message.includes("not opened"))) {
                console.log("Attempting to reconnect to database...");

                // Attempt to reinitialize the database
                try {
                    const newDb = await SQLite.openDatabaseAsync('financialApp.db');
                    setDb(newDb);
                    console.log("Database reconnection successful");
                    return null;
                } catch (reconnectError) {
                    console.error("Failed to reconnect to database:", reconnectError);
                }
            }

            return null;
        }
    };

    useEffect(() => {
        let isMounted = true;

        async function setupDatabase() {
            try {
                console.log("Opening database...");
                const database = await SQLite.openDatabaseAsync('financialApp.db');

                if (!isMounted) return;

                setDb(database);

                // Run database operations sequentially to avoid race conditions
                await database.execAsync('PRAGMA journal_mode = WAL;'); // Enable Write-Ahead Logging for better concurrency

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

                // Add transaction history table for audit trail
                console.log("Creating transaction history table...");
                await database.execAsync(
                    'CREATE TABLE IF NOT EXISTS transaction_history (id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id INTEGER, action TEXT, timestamp TEXT, data TEXT);'
                );

                // Add archive tables
                console.log("Creating archive tables...");
                await database.execAsync(
                    'CREATE TABLE IF NOT EXISTS archived_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, original_id INTEGER, type TEXT, amount REAL, category TEXT, description TEXT, location TEXT, date TEXT, archived_date TEXT);'
                );

                await database.execAsync(
                    'CREATE TABLE IF NOT EXISTS archive_settings (id INTEGER PRIMARY KEY, auto_archive BOOLEAN, archive_after_months INTEGER, keep_recent_months INTEGER);'
                );

                // Load archive settings
                await loadArchiveSettings(database);

                if (!isMounted) return;

                setDbInitialized(true);
                setInitRetries(0);

                // Load initial data sequentially
                console.log("Loading initial data...");
                await loadAssets(database);
                await loadTransactions(database);
                await loadBudgets(database);

            } catch (error) {
                console.error('Database setup error:', error);

                if (!isMounted) return;

                setIsLoading(false);

                // Retry initialization if it fails with specific errors
                if (initRetries < MAX_RETRIES &&
                    error.message &&
                    (error.message.includes("NullPointerException") ||
                        error.message.includes("not opened"))) {
                    console.log(`Retrying database setup (attempt ${initRetries + 1}/${MAX_RETRIES})...`);
                    setInitRetries(prev => prev + 1);

                    // Wait a moment before retrying
                    setTimeout(setupDatabase, 1000);
                }
            }
        }

        setupDatabase();

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [initRetries]); // Only depend on initRetries so we can control retries

    // Load assets from database
    const loadAssets = async (database) => {
        try {
            const db = database || this.db;
            if (!db) {
                console.warn("Cannot load assets: database not initialized");
                return;
            }

            const result = await db.getAllAsync('SELECT * FROM assets');
            // Sort by amount before setting state
            setAssets(sortAssetsByAmount(result));
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading assets', error);
            setIsLoading(false);
        }
    };

    // Load transactions from database
    const loadTransactions = async (database) => {
        try {
            const db = database || this.db;
            if (!db) {
                console.warn("Cannot load transactions: database not initialized");
                return;
            }

            // Calculate cutoff date based on keepRecentMonths
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - archiveSettings.keepRecentMonths);
            const cutoffDateString = cutoffDate.toISOString();

            // Only load transactions newer than cutoff date
            const result = await db.getAllAsync(
                'SELECT * FROM transactions WHERE date >= ? ORDER BY date DESC',
                [cutoffDateString]
            );
            setTransactions(result);

            // Auto-archive if enabled
            if (archiveSettings.autoArchive) {
                await autoArchiveOldTransactions();
            }
        } catch (error) {
            console.error('Error loading transactions', error);
        }
    };

    // Load budgets from database
    const loadBudgets = async (database) => {
        try {
            const db = database || this.db;
            if (!db) {
                console.warn("Cannot load budgets: database not initialized");
                return;
            }

            const result = await db.getAllAsync('SELECT * FROM budgets');
            setBudgets(result);
        } catch (error) {
            console.error('Error loading budgets', error);
        }
    };

    // Load archive settings
    const loadArchiveSettings = async (database) => {
        try {
            const db = database || this.db;
            if (!db) return;

            const result = await db.getAllAsync('SELECT * FROM archive_settings WHERE id = 1');
            if (result.length > 0) {
                const settings = result[0];
                setArchiveSettings({
                    autoArchive: Boolean(settings.auto_archive),
                    archiveAfterMonths: settings.archive_after_months,
                    keepRecentMonths: settings.keep_recent_months,
                });
            } else {
                // Insert default settings
                await db.runAsync(
                    'INSERT INTO archive_settings (id, auto_archive, archive_after_months, keep_recent_months) VALUES (1, ?, ?, ?)',

                    [1, 12, 3]
                );
            }
        } catch (error) {
            console.error('Error loading archive settings', error);
        }
    };

    // Update archive settings
    const updateArchiveSettings = async (newSettings) => {
        return safeDbOperation(async () => {
            await db.runAsync(
                'UPDATE archive_settings SET auto_archive = ?, archive_after_months = ?, keep_recent_months = ? WHERE id = 1',
                [newSettings.autoArchive ? 1 : 0, newSettings.archiveAfterMonths, newSettings.keepRecentMonths]
            );
            setArchiveSettings(newSettings);
        }, 'Error updating archive settings');
    };

    // Add a new asset
    const addAsset = async (asset) => {
        return safeDbOperation(async () => {
            const result = await db.runAsync(
                'INSERT INTO assets (name, amount, currency, image) VALUES (?, ?, ?, ?)',
                [asset.name, asset.amount, asset.currency, asset.image]
            );
            const newAsset = { ...asset, id: result.lastInsertRowId };
            // Sort assets after adding a new one
            setAssets(sortAssetsByAmount([...assets, newAsset]));
            return newAsset;
        }, 'Error adding asset');
    };

    // Update an asset
    const updateAsset = async (asset) => {
        return safeDbOperation(async () => {
            await db.runAsync(
                'UPDATE assets SET name = ?, amount = ?, currency = ?, image = ? WHERE id = ?',
                [asset.name, asset.amount, asset.currency, asset.image, asset.id]
            );
            // Sort assets after updating
            const updatedAssets = assets.map(a => a.id === asset.id ? asset : a);
            setAssets(sortAssetsByAmount(updatedAssets));
            return asset;
        }, 'Error updating asset');
    };

    // Delete an asset
    const deleteAsset = async (id) => {
        return safeDbOperation(async () => {
            await db.runAsync('DELETE FROM assets WHERE id = ?', [id]);
            // No need to sort after deletion, but maintaining consistency
            const filteredAssets = assets.filter(a => a.id !== id);
            setAssets(sortAssetsByAmount(filteredAssets));
            return id;
        }, 'Error deleting asset');
    };

    // Calculate total assets
    const getTotalAssets = () => {
        return assets.reduce((total, asset) => total + parseFloat(asset.amount), 0);
    };

    // Add a new transaction
    const addTransaction = async (transaction) => {
        return safeDbOperation(async () => {
            try {
                // Validate transaction data to prevent null values
                const validatedTransaction = {
                    type: (transaction.type || '').toLowerCase(), // Normalize type to lowercase
                    amount: parseFloat(transaction.amount) || 0,
                    category: transaction.category || '',
                    description: transaction.description || '',
                    location: transaction.location || '',
                    date: transaction.date || new Date().toISOString()
                };

                // Use a transaction to ensure all operations succeed or fail together
                await db.withTransactionAsync(async () => {
                    // Insert the transaction record
                    const result = await db.runAsync(
                        'INSERT INTO transactions (type, amount, category, description, location, date) VALUES (?, ?, ?, ?, ?, ?)',
                        [
                            validatedTransaction.type,
                            validatedTransaction.amount,
                            validatedTransaction.category,
                            validatedTransaction.description,
                            validatedTransaction.location,
                            validatedTransaction.date
                        ]
                    );

                    // Update asset amount based on the transaction
                    if (validatedTransaction.location) {
                        const asset = assets.find(a => a.name === validatedTransaction.location);
                        if (asset) {
                            let newAmount = parseFloat(asset.amount);
                            if (validatedTransaction.type === 'income') {
                                newAmount += validatedTransaction.amount;
                            } else if (validatedTransaction.type === 'expense') {
                                newAmount -= validatedTransaction.amount;
                            }

                            await db.runAsync(
                                'UPDATE assets SET amount = ? WHERE id = ?',
                                [newAmount, asset.id]
                            );

                            // Update assets state
                            const updatedAsset = { ...asset, amount: newAmount };
                            const updatedAssets = assets.map(a => a.id === asset.id ? updatedAsset : a);
                            setAssets(sortAssetsByAmount(updatedAssets));
                        }
                    }

                    // If it's an expense, update the corresponding budget
                    if (validatedTransaction.type === 'expense' && validatedTransaction.category) {
                        // Find budgets that match this category
                        const matchingBudgets = budgets.filter(b => b.category === validatedTransaction.category);

                        // Update each matching budget
                        for (const budget of matchingBudgets) {
                            const spent = parseFloat(budget.spent || 0) + validatedTransaction.amount;
                            await db.runAsync(
                                'UPDATE budgets SET spent = ? WHERE id = ?',
                                [spent, budget.id]
                            );

                            // Update budgets state
                            const updatedBudget = { ...budget, spent };
                            setBudgets(budgets.map(b => b.id === budget.id ? updatedBudget : b));
                        }
                    }

                    const newTransaction = {
                        ...validatedTransaction,
                        id: result.lastInsertRowId
                    };
                    setTransactions([newTransaction, ...transactions]);
                    return newTransaction;
                });
            } catch (error) {
                console.error('Error in transaction processing:', error);
                throw error; // Re-throw to be handled by safeDbOperation
            }
        }, 'Error adding transaction');
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
            // Find the transaction to be deleted
            const transactionToDelete = transactions.find(t => t.id === id);

            if (!transactionToDelete) {
                console.error('Transaction not found:', id);
                return false;
            }

            // Save transaction data for audit trail and undo functionality
            const timestamp = new Date().toISOString();
            const historyData = JSON.stringify(transactionToDelete);

            await db.withTransactionAsync(async () => {
                // Reverse the effect on the associated asset
                if (transactionToDelete.location) {
                    const asset = assets.find(a => a.name === transactionToDelete.location);
                    if (asset) {
                        let newAmount = parseFloat(asset.amount);

                        // Reverse the original transaction effect
                        if (transactionToDelete.type === 'income') {
                            newAmount -= parseFloat(transactionToDelete.amount);
                        } else if (transactionToDelete.type === 'expense') {
                            newAmount += parseFloat(transactionToDelete.amount);
                        }

                        // Update the asset in the database
                        await db.runAsync(
                            'UPDATE assets SET amount = ? WHERE id = ?',
                            [newAmount, asset.id]
                        );

                        // Update assets state
                        const updatedAsset = { ...asset, amount: newAmount };
                        const updatedAssets = assets.map(a => a.id === asset.id ? updatedAsset : a);
                        setAssets(sortAssetsByAmount(updatedAssets));
                    }
                }

                // If it was an expense, update the corresponding budget
                if (transactionToDelete.type === 'expense' && transactionToDelete.category) {
                    const matchingBudgets = budgets.filter(b => b.category === transactionToDelete.category);

                    for (const budget of matchingBudgets) {
                        // Decrease the spent amount
                        const spent = Math.max(0, parseFloat(budget.spent || 0) - parseFloat(transactionToDelete.amount));
                        await db.runAsync(
                            'UPDATE budgets SET spent = ? WHERE id = ?',
                            [spent, budget.id]
                        );

                        // Update budgets state
                        const updatedBudget = { ...budget, spent };
                        setBudgets(budgets.map(b => b.id === budget.id ? updatedBudget : b));
                    }
                }

                // Add to transaction history for audit trail
                await db.runAsync(
                    'INSERT INTO transaction_history (transaction_id, action, timestamp, data) VALUES (?, ?, ?, ?)',
                    [id, 'delete', timestamp, historyData]
                );

                // Delete the transaction from the database
                await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
            });

            // Update state
            setTransactions(transactions.filter(t => t.id !== id));

            // Add transaction to recently deleted for undo functionality
            addToRecentlyDeleted(transactionToDelete);

            return true;
        } catch (error) {
            console.error('Error deleting transaction', error);
            return false;
        }
    };

    // Store recently deleted transactions for undo functionality
    const addToRecentlyDeleted = (transaction) => {
        // Keep only the most recent 5 deleted transactions
        const updatedRecent = [transaction, ...recentlyDeleted.slice(0, 4)];
        setRecentlyDeleted(updatedRecent);
    };

    // Undo a deleted transaction
    const undoDeleteTransaction = async (transaction) => {
        try {
            // Re-add the transaction
            await addTransaction(transaction);

            // Remove from recently deleted
            setRecentlyDeleted(recentlyDeleted.filter(t => t.id !== transaction.id));

            // Add to history
            const timestamp = new Date().toISOString();
            const historyData = JSON.stringify(transaction);

            await db.runAsync(
                'INSERT INTO transaction_history (transaction_id, action, timestamp, data) VALUES (?, ?, ?, ?)',
                [transaction.id, 'restore', timestamp, historyData]
            );

            return true;
        } catch (error) {
            console.error('Error restoring transaction', error);
            return false;
        }
    };

    // Get transaction history for audit trail
    const getTransactionHistory = async () => {
        try {
            const result = await db.getAllAsync(
                'SELECT * FROM transaction_history ORDER BY timestamp DESC'
            );

            // Parse the data field from JSON
            return result.map(item => ({
                ...item,
                data: JSON.parse(item.data)
            }));
        } catch (error) {
            console.error('Error getting transaction history', error);
            return [];
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

    // Auto-archive old transactions
    const autoArchiveOldTransactions = async () => {
        return safeDbOperation(async () => {
            const archiveDate = new Date();
            archiveDate.setMonth(archiveDate.getMonth() - archiveSettings.archiveAfterMonths);
            const archiveDateString = archiveDate.toISOString();

            // Get transactions to archive
            const transactionsToArchive = await db.getAllAsync(
                'SELECT * FROM transactions WHERE date < ?',
                [archiveDateString]
            );

            if (transactionsToArchive.length === 0) return;

            console.log(`Auto-archiving ${transactionsToArchive.length} old transactions`);

            await db.withTransactionAsync(async () => {
                // Move transactions to archive
                for (const transaction of transactionsToArchive) {
                    await db.runAsync(
                        'INSERT INTO archived_transactions (original_id, type, amount, category, description, location, date, archived_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            transaction.id,
                            transaction.type,
                            transaction.amount,
                            transaction.category,
                            transaction.description,
                            transaction.location,
                            transaction.date,
                            new Date().toISOString()
                        ]
                    );
                }

                // Remove from main transactions table
                await db.runAsync(
                    'DELETE FROM transactions WHERE date < ?',
                    [archiveDateString]
                );
            });

            // Reload transactions
            await loadTransactions();
        }, 'Error auto-archiving transactions');
    };

    // Manual archive transactions by date range
    const archiveTransactionsByDateRange = async (startDate, endDate) => {
        return safeDbOperation(async () => {
            const transactionsToArchive = await db.getAllAsync(
                'SELECT * FROM transactions WHERE date >= ? AND date <= ?',
                [startDate, endDate]
            );

            if (transactionsToArchive.length === 0) return 0;

            await db.withTransactionAsync(async () => {
                for (const transaction of transactionsToArchive) {
                    await db.runAsync(
                        'INSERT INTO archived_transactions (original_id, type, amount, category, description, location, date, archived_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            transaction.id,
                            transaction.type,
                            transaction.amount,
                            transaction.category,
                            transaction.description,
                            transaction.location,
                            transaction.date,
                            new Date().toISOString()
                        ]
                    );
                }

                await db.runAsync(
                    'DELETE FROM transactions WHERE date >= ? AND date <= ?',
                    [startDate, endDate]
                );
            });

            await loadTransactions();
            return transactionsToArchive.length;
        }, 'Error archiving transactions by date range');
    };

    // Load archived transactions with pagination
    const loadArchivedTransactions = async (page = 0, limit = 50) => {
        return safeDbOperation(async () => {
            const offset = page * limit;
            const result = await db.getAllAsync(
                'SELECT * FROM archived_transactions ORDER BY date DESC LIMIT ? OFFSET ?',
                [limit, offset]
            );

            if (page === 0) {
                setArchivedTransactions(result);
            } else {
                setArchivedTransactions(prev => [...prev, ...result]);
            }

            return result;
        }, 'Error loading archived transactions');
    };

    // Get archived transactions count
    const getArchivedTransactionsCount = async () => {
        return safeDbOperation(async () => {
            const result = await db.getAllAsync('SELECT COUNT(*) as count FROM archived_transactions');
            return result[0]?.count || 0;
        }, 'Error getting archived transactions count');
    };

    // Restore archived transaction
    const restoreArchivedTransaction = async (archivedId) => {
        return safeDbOperation(async () => {
            const archived = await db.getAllAsync(
                'SELECT * FROM archived_transactions WHERE id = ?',
                [archivedId]
            );

            if (archived.length === 0) return false;

            const transaction = archived[0];

            await db.withTransactionAsync(async () => {
                // Add back to main transactions
                await db.runAsync(
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

                // Remove from archive
                await db.runAsync('DELETE FROM archived_transactions WHERE id = ?', [archivedId]);
            });

            await loadTransactions();
            await loadArchivedTransactions();
            return true;
        }, 'Error restoring archived transaction');
    };

    // Delete archived transaction permanently
    const deleteArchivedTransaction = async (archivedId) => {
        return safeDbOperation(async () => {
            await db.runAsync('DELETE FROM archived_transactions WHERE id = ?', [archivedId]);
            await loadArchivedTransactions();
            return true;
        }, 'Error deleting archived transaction');
    };

    // Get archive statistics
    const getArchiveStatistics = async () => {
        return safeDbOperation(async () => {
            const stats = await db.getAllAsync(`
                SELECT 
                    COUNT(*) as total_archived,
                    MIN(date) as oldest_date,
                    MAX(date) as newest_date,
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
                FROM archived_transactions
            `);

            return stats[0] || {
                total_archived: 0,
                oldest_date: null,
                newest_date: null,
                total_income: 0,
                total_expenses: 0
            };
        }, 'Error getting archive statistics');
    };

    // Search transactions (both active and archived)
    const searchAllTransactions = async (searchTerm, includeArchived = false) => {
        return safeDbOperation(async () => {
            const searchPattern = `%${searchTerm}%`;

            // Search active transactions
            const activeResults = await db.getAllAsync(
                'SELECT *, "active" as source FROM transactions WHERE category LIKE ? OR description LIKE ? OR location LIKE ? ORDER BY date DESC',
                [searchPattern, searchPattern, searchPattern]
            );

            if (!includeArchived) return activeResults;

            // Search archived transactions
            const archivedResults = await db.getAllAsync(
                'SELECT *, "archived" as source FROM archived_transactions WHERE category LIKE ? OR description LIKE ? OR location LIKE ? ORDER BY date DESC',
                [searchPattern, searchPattern, searchPattern]
            );

            return [...activeResults, ...archivedResults];
        }, 'Error searching transactions');
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
                dbInitialized,
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
                sortedAssets: sortAssetsByAmount(assets),
                undoDeleteTransaction,
                recentlyDeleted,
                getTransactionHistory,
                archivedTransactions,
                archiveSettings,
                updateArchiveSettings,
                autoArchiveOldTransactions,
                archiveTransactionsByDateRange,
                loadArchivedTransactions,
                getArchivedTransactionsCount,
                restoreArchivedTransaction,
                deleteArchivedTransaction,
                getArchiveStatistics,
                searchAllTransactions,
            }}
        >
            {children}
        </DatabaseContext.Provider>
    );
};
