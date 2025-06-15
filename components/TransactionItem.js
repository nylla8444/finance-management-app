import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PreferencesContext } from '../context/PreferencesContext';

// Map categories to icons
const CATEGORY_ICONS = {
    // Expense categories
    'Food & Dining': 'restaurant',
    'Shopping': 'cart',
    'Transportation': 'car',
    'Entertainment': 'film',
    'Bills & Utilities': 'receipt',
    'Health': 'medical',
    'Education': 'school',
    'Travel': 'airplane',
    'Personal Care': 'person',
    'Other': 'ellipsis-horizontal-circle',

    // Income categories
    'Salary': 'cash',
    'Freelance': 'briefcase',
    'Business': 'business',
    'Investments': 'trending-up',
    'Gifts': 'gift',
    'Rental Income': 'home',
    'Refunds': 'return-down-back',
    'Allowance': 'wallet',
};

export default function TransactionItem({ transaction, onPress, theme }) {
    const { type, amount, category, description, date, location } = transaction;
    const { currency } = useContext(PreferencesContext);

    // Format the date
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Get icon for category or use default
    const iconName = CATEGORY_ICONS[category] || 'ellipsis-horizontal-circle';

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.card }]}
            onPress={() => onPress(transaction)}
        >
            <View style={[
                styles.iconContainer,
                { backgroundColor: type === 'expense' ? '#FFECEC' : '#E6F9E8' }
            ]}>
                <Ionicons
                    name={iconName}
                    size={22}
                    color={type === 'expense' ? '#FF6B6B' : '#4CAF50'}
                />
            </View>

            <View style={styles.detailsContainer}>
                <Text style={[styles.category, { color: theme.text }]}>{category}</Text>
                {description ? (
                    <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={1}>
                        {description}
                    </Text>
                ) : (
                    <Text style={[styles.location, { color: theme.textSecondary }]}>
                        {location}
                    </Text>
                )}
            </View>

            <View style={styles.rightContainer}>
                <Text style={[
                    styles.amount,
                    { color: type === 'expense' ? '#FF6B6B' : '#4CAF50' }
                ]}>
                    {type === 'expense' ? '-' : '+'} {currency} {parseFloat(amount).toFixed(2)}
                </Text>
                <Text style={[styles.date, { color: theme.textSecondary }]}>
                    {formattedDate}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    detailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    category: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        opacity: 0.7,
    },
    location: {
        fontSize: 14,
        opacity: 0.7,
    },
    rightContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        opacity: 0.7,
    },
});
