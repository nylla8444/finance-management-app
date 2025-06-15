import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PreferencesContext = createContext();

export const PreferencesProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(false);
    const [currency, setCurrency] = useState('PHP');
    const [resetPeriod, setResetPeriod] = useState('monthly'); // weekly, monthly, yearly

    // Define theme colors
    const lightTheme = {
        background: '#FFFFFF',
        text: '#000000',
        primary: '#007AFF',
        secondary: '#E5E5EA',
        card: '#F2F2F7',
        border: '#C7C7CC',
    };

    const darkTheme = {
        background: '#000000',
        text: '#FFFFFF',
        primary: '#00C853',
        secondary: '#2C2C2E',
        card: '#1C1C1E',
        border: '#3A3A3C',
    };

    // Load preferences from AsyncStorage
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const storedDarkMode = await AsyncStorage.getItem('darkMode');
                const storedCurrency = await AsyncStorage.getItem('currency');
                const storedResetPeriod = await AsyncStorage.getItem('resetPeriod');

                if (storedDarkMode !== null) {
                    setDarkMode(JSON.parse(storedDarkMode));
                }
                if (storedCurrency !== null) {
                    setCurrency(storedCurrency);
                }
                if (storedResetPeriod !== null) {
                    setResetPeriod(storedResetPeriod);
                }
            } catch (error) {
                console.error('Error loading preferences', error);
            }
        };

        loadPreferences();
    }, []);

    // Toggle dark mode
    const toggleDarkMode = async () => {
        try {
            const newMode = !darkMode;
            setDarkMode(newMode);
            await AsyncStorage.setItem('darkMode', JSON.stringify(newMode));
        } catch (error) {
            console.error('Error saving dark mode preference', error);
        }
    };

    // Change currency
    const changeCurrency = async (newCurrency) => {
        try {
            setCurrency(newCurrency);
            await AsyncStorage.setItem('currency', newCurrency);
        } catch (error) {
            console.error('Error saving currency preference', error);
        }
    };

    // Change reset period
    const changeResetPeriod = async (newPeriod) => {
        try {
            setResetPeriod(newPeriod);
            await AsyncStorage.setItem('resetPeriod', newPeriod);
        } catch (error) {
            console.error('Error saving reset period preference', error);
        }
    };

    return (
        <PreferencesContext.Provider
            value={{
                darkMode,
                toggleDarkMode,
                currency,
                changeCurrency,
                resetPeriod,
                changeResetPeriod,
                theme: darkMode ? darkTheme : lightTheme,
            }}
        >
            {children}
        </PreferencesContext.Provider>
    );
};
