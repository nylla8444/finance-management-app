import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PreferencesContext } from '../context/PreferencesContext';

export default function BudgetItem({ budget, spent, onEdit, onDelete, theme }) {
    const { category, amount, period } = budget;
    const { currency } = useContext(PreferencesContext);

    // Calculate percentage used
    const percentUsed = Math.min(100, (amount - spent) / amount * 100);
    const isOverBudget = spent < 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.card }]}>
            <View style={styles.header}>
                <Text style={[styles.category, { color: theme.text }]}>{category}</Text>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
                        <Ionicons name="pencil-outline" size={18} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.amounts}>
                <Text style={[styles.spent, { color: isOverBudget ? '#FF6B6B' : '#4CAF50' }]}>
                    {currency} {parseFloat(spent).toFixed(2)} left
                </Text>
                <Text style={[styles.total, { color: theme.textSecondary }]}>
                    of {currency} {parseFloat(amount).toFixed(2)}
                </Text>
            </View>

            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${percentUsed}%`,
                                backgroundColor: isOverBudget ? '#FF6B6B' : '#4CAF50'
                            }
                        ]}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    category: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        marginLeft: 12,
    },
    amounts: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    spent: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 6,
    },
    total: {
        fontSize: 14,
    },
    progressContainer: {
        marginTop: 4,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        width: '100%',
        backgroundColor: '#e0e0e0',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
});
