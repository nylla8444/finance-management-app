import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PreferencesContext } from '../context/PreferencesContext';

export default function TransactionSummary({ income, expense, period, onChangePeriod, theme }) {
    const balance = income - expense;
    const { currency } = useContext(PreferencesContext);

    return (
        <View style={[styles.container, { backgroundColor: theme.card }]}>
            <View style={styles.periodSelector}>
                <Text style={[styles.periodLabel, { color: theme.text }]}>Summary:</Text>
                <TouchableOpacity
                    style={styles.periodButton}
                    onPress={onChangePeriod}
                >
                    <Text style={[styles.periodText, { color: theme.primary }]}>{period}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Income</Text>
                    <Text style={[styles.summaryValue, styles.incomeText]}>
                        {currency} {income.toFixed(2)}
                    </Text>
                </View>

                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Expenses</Text>
                    <Text style={[styles.summaryValue, styles.expenseText]}>
                        {currency} {expense.toFixed(2)}
                    </Text>
                </View>

                <View style={[styles.summaryItem, styles.balanceItem]}>
                    <Text style={[styles.summaryLabel, styles.balanceLabel]}>Balance</Text>
                    <Text style={[
                        styles.summaryValue,
                        balance >= 0 ? styles.positiveBalance : styles.negativeBalance
                    ]}>
                        {currency} {Math.abs(balance).toFixed(2)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    periodSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    periodLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    periodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        padding: 4,
    },
    periodText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 4,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    balanceItem: {
        borderLeftWidth: 1,
        borderLeftColor: '#e0e0e0',
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    balanceLabel: {
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    incomeText: {
        color: '#4CAF50',
    },
    expenseText: {
        color: '#FF6B6B',
    },
    positiveBalance: {
        color: '#4CAF50',
    },
    negativeBalance: {
        color: '#FF6B6B',
    },
});
