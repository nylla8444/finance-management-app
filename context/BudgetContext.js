// filepath: c:\Users\ledes\Documents\expo_test\financial-management-app\context\BudgetContext.js
import React, { createContext, useState, useEffect } from 'react';
import { db } from './DatabaseContext';

export const BudgetContext = createContext();

export const BudgetProvider = ({ children }) => {
    const [budgets, setBudgets] = useState([]);
    const [goal, setGoal] = useState(0);

    useEffect(() => {
        loadBudgets();
    }, []);

    // Load budgets from database
    const loadBudgets = async () => {
        try {
            const result = await db.getAllAsync('SELECT * FROM budgets');
            setBudgets(result);
        } catch (error) {
            console.error('Error loading budgets', error);
        }
    };

    // Add a new budget category
    const addBudget = async (budget) => {
        try {
            await db.runAsync(
                'INSERT INTO budgets (category, amount, period) VALUES (?, ?, ?)',
                [budget.category, budget.amount, budget.period]
            );
            loadBudgets(); // Refresh budgets
        } catch (error) {
            console.error('Error adding budget', error);
        }
    };

    // Update a budget category
    const updateBudget = async (budget) => {
        try {
            await db.runAsync(
                'UPDATE budgets SET amount = ?, period = ? WHERE id = ?',
                [budget.amount, budget.period, budget.id]
            );
            loadBudgets(); // Refresh budgets
        } catch (error) {
            console.error('Error updating budget', error);
        }
    };

    // Delete a budget category
    const deleteBudget = async (id) => {
        try {
            await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
            loadBudgets(); // Refresh budgets
        } catch (error) {
            console.error('Error deleting budget', error);
        }
    };

    // Calculate total budget left
    const getTotalBudgetLeft = () => {
        return budgets.reduce((total, budget) => total + parseFloat(budget.amount), 0);
    };

    return (
        <BudgetContext.Provider
            value={{
                budgets,
                goal,
                setGoal,
                addBudget,
                updateBudget,
                deleteBudget,
                getTotalBudgetLeft,
            }}
        >
            {children}
        </BudgetContext.Provider>
    );
};