import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseContext } from '../context/DatabaseContext';
import { PreferencesContext } from '../context/PreferencesContext';

// Expense categories from TransactionForm
const EXPENSE_CATEGORIES = [
    'Food & Dining', 'Shopping', 'Transportation', 'Entertainment',
    'Bills & Utilities', 'Health', 'Education', 'Travel', 'Personal Care', 'Other'
];

const PERIODS = ['Weekly', 'Monthly', 'Yearly'];

export default function BudgetForm({ visible, budget, onClose, defaultPeriod, theme }) {
    const { addBudget, updateBudget } = useContext(DatabaseContext);
    const { currency } = useContext(PreferencesContext);

    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState(defaultPeriod || 'Monthly');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showPeriodModal, setShowPeriodModal] = useState(false);

    // Reset form when modal is opened or closed
    useEffect(() => {
        if (visible) {
            if (budget) {
                // Editing an existing budget
                setCategory(budget.category);
                setAmount(budget.amount.toString());
                setPeriod(budget.period);
            } else {
                // Adding a new budget
                setCategory('');
                setAmount('');
                setPeriod(defaultPeriod || 'Monthly');
            }
        }
    }, [visible, budget, defaultPeriod]);

    const handleSave = () => {
        // Validate inputs
        if (!category) {
            Alert.alert('Error', 'Please select a category');
            return;
        }

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        const budgetData = {
            category,
            amount: parseFloat(amount),
            period,
            spent: 0
        };

        if (budget) {
            // Update existing budget
            updateBudget({ ...budgetData, id: budget.id });
        } else {
            // Add new budget
            addBudget(budgetData);
        }

        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {budget ? 'Edit Budget' : 'Add Budget'}
                        </Text>
                        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formContainer}>
                        {/* Category Selector */}
                        <TouchableOpacity
                            style={[styles.selectorContainer, { borderColor: theme.border }]}
                            onPress={() => setShowCategoryModal(true)}
                        >
                            <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                            <Text style={[
                                styles.selectorText,
                                !category && styles.placeholder,
                                { color: category ? theme.text : theme.placeholder }
                            ]}>
                                {category || 'Select category'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={theme.text} />
                        </TouchableOpacity>

                        {/* Amount Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: theme.text }]}>Budget Amount ({currency})</Text>
                            <TextInput
                                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                placeholder="0.00"
                                placeholderTextColor={theme.placeholder}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>

                        {/* Period Selector */}
                        <TouchableOpacity
                            style={[styles.selectorContainer, { borderColor: theme.border }]}
                            onPress={() => setShowPeriodModal(true)}
                        >
                            <Text style={[styles.label, { color: theme.text }]}>Period</Text>
                            <Text style={[styles.selectorText, { color: theme.text }]}>
                                {period}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Category Modal */}
                    <Modal
                        visible={showCategoryModal}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowCategoryModal(false)}
                    >
                        <View style={styles.pickerModalOverlay}>
                            <View style={[styles.pickerModalContent, { backgroundColor: theme.card }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
                                    <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                        <Ionicons name="close" size={24} color={theme.text} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.modalList}>
                                    {EXPENSE_CATEGORIES.map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            style={styles.modalItem}
                                            onPress={() => {
                                                setCategory(item);
                                                setShowCategoryModal(false);
                                            }}
                                        >
                                            <Text style={[styles.modalItemText, { color: theme.text }]}>{item}</Text>
                                            {category === item && (
                                                <Ionicons name="checkmark" size={20} color="#4CAF50" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>

                    {/* Period Modal */}
                    <Modal
                        visible={showPeriodModal}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowPeriodModal(false)}
                    >
                        <View style={styles.pickerModalOverlay}>
                            <View style={[styles.pickerModalContent, { backgroundColor: theme.card }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={[styles.modalTitle, { color: theme.text }]}>Select Period</Text>
                                    <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
                                        <Ionicons name="close" size={24} color={theme.text} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.modalList}>
                                    {PERIODS.map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            style={styles.modalItem}
                                            onPress={() => {
                                                setPeriod(item);
                                                setShowPeriodModal(false);
                                            }}
                                        >
                                            <Text style={[styles.modalItemText, { color: theme.text }]}>{item}</Text>
                                            {period === item && (
                                                <Ionicons name="checkmark" size={20} color="#4CAF50" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    closeButton: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
    },
    saveText: {
        color: 'white',
        fontWeight: 'bold',
    },
    formContainer: {
        padding: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        marginBottom: 8,
        fontSize: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    selectorContainer: {
        marginBottom: 20,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectorText: {
        flex: 1,
        fontSize: 16,
        marginLeft: 10,
    },
    placeholder: {
        color: '#aaa',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '85%',
        borderRadius: 16,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    pickerModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end', // Position at bottom
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    pickerModalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 30, // Add extra padding at bottom for better appearance
        maxHeight: '70%', // Limit height to prevent taking up full screen
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalList: {
        marginBottom: 20,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalItemText: {
        fontSize: 16,
    },
});
