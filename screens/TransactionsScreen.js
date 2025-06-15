import React, { useState, useContext, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Modal,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseContext } from '../context/DatabaseContext';
import { PreferencesContext } from '../context/PreferencesContext';
import TransactionSummary from '../components/TransactionSummary';
import TransactionItem from '../components/TransactionItem';
import TransactionForm from '../components/TransactionForm';

// Periods for grouping transactions
const PERIODS = ['Week', 'Month', 'Year'];

export default function TransactionsScreen() {
    const { transactions, assets, addTransaction, updateTransaction, deleteTransaction, loadTransactions } = useContext(DatabaseContext);
    const { theme } = useContext(PreferencesContext);

    const [filter, setFilter] = useState('all'); // 'all', 'income', 'expense'
    const [period, setPeriod] = useState('Month');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    // Load transactions when screen is focused
    useEffect(() => {
        loadTransactions();
    }, []);

    // Get filtered transactions
    const getFilteredTransactions = () => {
        if (filter === 'all') return transactions;
        return transactions.filter(t => t.type === filter);
    };

    // Calculate period start date
    const getPeriodStartDate = () => {
        const now = new Date();
        switch (period) {
            case 'Week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                return weekStart;
            case 'Month':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            case 'Year':
                return new Date(now.getFullYear(), 0, 1);
            default:
                return new Date(0);
        }
    };

    // Get transactions for current period
    const getPeriodTransactions = () => {
        const startDate = getPeriodStartDate();
        return getFilteredTransactions().filter(t => new Date(t.date) >= startDate);
    };

    // Calculate summary values
    const periodTransactions = getPeriodTransactions();
    const incomeTotal = periodTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expenseTotal = periodTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Handle adding or updating a transaction
    const handleSaveTransaction = (transaction) => {
        if (transaction.delete) {
            // Handle deletion
            deleteTransaction(transaction.id);
        } else if (transaction.id) {
            // Update existing transaction
            updateTransaction(transaction);
        } else {
            // Add new transaction
            addTransaction(transaction);
        }
        setShowAddModal(false);
        setEditingTransaction(null);
    };

    // Handle transaction item press - show options
    const handleTransactionPress = (transaction) => {
        Alert.alert(
            transaction.category,
            `Amount: $${transaction.amount}\nDate: ${new Date(transaction.date).toLocaleDateString()}\nLocation: ${transaction.location}${transaction.description ? `\nDescription: ${transaction.description}` : ''}`,
            [
                { text: 'Close', style: 'cancel' },
                {
                    text: 'Edit',
                    onPress: () => {
                        setEditingTransaction(transaction);
                        setShowAddModal(true);
                    }
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => confirmDeleteTransaction(transaction.id)
                }
            ]
        );
    };

    // Confirm transaction deletion
    const confirmDeleteTransaction = (id) => {
        Alert.alert(
            "Delete Transaction",
            "Are you sure you want to delete this transaction?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteTransaction(id)
                }
            ]
        );
    };

    // Group transactions by date
    const groupTransactionsByDate = () => {
        const grouped = {};
        getFilteredTransactions().forEach(transaction => {
            const date = new Date(transaction.date).toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(transaction);
        });

        return Object.keys(grouped).map(date => ({
            date,
            data: grouped[date]
        })).sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const renderHeader = () => (
        <>
            <TransactionSummary
                income={incomeTotal}
                expense={expenseTotal}
                period={period}
                onChangePeriod={() => setShowPeriodModal(true)}
                theme={theme}
            />

            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filter === 'all' && styles.activeFilterButton,
                        filter === 'all' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[
                        styles.filterText,
                        filter === 'all' && styles.activeFilterText
                    ]}>All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filter === 'income' && styles.activeFilterButton,
                        filter === 'income' && { backgroundColor: '#4CAF50' }
                    ]}
                    onPress={() => setFilter('income')}
                >
                    <Text style={[
                        styles.filterText,
                        filter === 'income' && styles.activeFilterText
                    ]}>Income</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filter === 'expense' && styles.activeFilterButton,
                        filter === 'expense' && { backgroundColor: '#FF6B6B' }
                    ]}
                    onPress={() => setFilter('expense')}
                >
                    <Text style={[
                        styles.filterText,
                        filter === 'expense' && styles.activeFilterText
                    ]}>Expenses</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    const renderItem = ({ item }) => (
        <View>
            <Text style={[styles.dateHeader, { color: theme.textSecondary }]}>
                {new Date(item.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                })}
            </Text>
            {item.data.map(transaction => (
                <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onPress={handleTransactionPress}
                    theme={theme}
                />
            ))}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {transactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={80} color={theme.textSecondary} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                        No transactions yet
                    </Text>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: theme.primary }]}
                        onPress={() => setShowAddModal(true)}
                    >
                        <Text style={styles.addButtonText}>Add Transaction</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={groupTransactionsByDate()}
                    renderItem={renderItem}
                    keyExtractor={item => item.date}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Floating Action Button */}
            {transactions.length > 0 && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.primary }]}
                    onPress={() => {
                        setEditingTransaction(null); // Clear any editing transaction
                        setShowAddModal(true);
                    }}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            )}

            {/* Transaction Form Modal - Make sure it's properly imported and configured */}
            <TransactionForm
                visible={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setEditingTransaction(null);
                }}
                onSave={handleSaveTransaction}
                transaction={editingTransaction}
                assets={assets}
                theme={theme} // Pass theme to the component
            />

            {/* Period Selection Modal */}
            <Modal
                visible={showPeriodModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPeriodModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPeriodModal(false)}
                >
                    <View
                        style={[styles.periodModal, { backgroundColor: theme.card }]}
                        onStartShouldSetResponder={() => true}
                    >
                        {PERIODS.map(p => (
                            <TouchableOpacity
                                key={p}
                                style={[
                                    styles.periodOption,
                                    period === p && { backgroundColor: theme.background }
                                ]}
                                onPress={() => {
                                    setPeriod(p);
                                    setShowPeriodModal(false);
                                }}
                            >
                                <Text style={[styles.periodOptionText, { color: theme.text }]}>{p}</Text>
                                {period === p && (
                                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginVertical: 12,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    activeFilterButton: {
        backgroundColor: '#007BFF',
    },
    filterText: {
        fontWeight: '500',
        color: '#666',
    },
    activeFilterText: {
        color: 'white',
    },
    dateHeader: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 80,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        marginTop: 16,
        marginBottom: 24,
    },
    addButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        backgroundColor: '#007BFF',
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    periodModal: {
        width: '70%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    periodOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    periodOptionText: {
        fontSize: 16,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
});