import React, { useState, useContext, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseContext } from '../context/DatabaseContext';
import { PreferencesContext } from '../context/PreferencesContext';
import BudgetItem from '../components/BudgetItem';
import BudgetForm from '../components/BudgetForm';
import BudgetGoalForm from '../components/BudgetGoalForm';
import { Picker } from '@react-native-picker/picker';

export default function BudgetScreen() {
    const { budgets, loadBudgets, transactions, getBudgetTotal, getBudgetRemaining, getTotalBudget, getTotalRemaining, deleteBudget, updateBudget } = useContext(DatabaseContext);
    const { theme, currency } = useContext(PreferencesContext);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [period, setPeriod] = useState('Monthly');
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        loadBudgets();
    }, []);

    const handleAddBudget = () => {
        setEditingBudget(null);
        setShowAddModal(true);
    };

    const handleEditBudget = (budget) => {
        setEditingBudget(budget);
        setShowAddModal(true);
    };

    const handleDeleteBudget = (id) => {
        Alert.alert(
            "Delete Budget",
            "Are you sure you want to delete this budget?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "OK", onPress: () => deleteBudget(id) }
            ]
        );
    };

    const filterBudgetsByPeriod = () => {
        return budgets.filter(budget => budget.period === period);
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={[styles.budgetGoalCard, { backgroundColor: theme.card }]}>
                <View style={styles.budgetGoalHeader}>
                    <Text style={[styles.budgetGoalTitle, { color: theme.text }]}>Budget Goal</Text>
                    <TouchableOpacity onPress={() => setShowGoalModal(true)}>
                        <Ionicons name="pencil-outline" size={20} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <View style={styles.budgetGoalInfo}>
                    <View style={styles.goalColumn}>
                        <Text style={[styles.goalAmount, { color: theme.text }]}>
                            {currency} {getTotalBudget(period).toFixed(2)}
                        </Text>
                        <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>Total Budget</Text>
                    </View>

                    <View style={styles.goalColumn}>
                        <Text style={[styles.goalAmount, { color: theme.text }]}>
                            {currency} {getTotalRemaining(period).toFixed(2)}
                        </Text>
                        <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>Remaining</Text>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${Math.min(100, (1 - getTotalRemaining(period) / getTotalBudget(period)) * 100)}%`,
                                    backgroundColor: getTotalRemaining(period) < 0 ? '#FF6B6B' : theme.primary
                                }
                            ]}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.periodSelector}>
                <TouchableOpacity
                    style={[
                        styles.periodButton,
                        period === 'Weekly' && styles.activePeriodButton,
                        period === 'Weekly' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setPeriod('Weekly')}
                >
                    <Text style={[
                        styles.periodButtonText,
                        period === 'Weekly' && styles.activePeriodText
                    ]}>Weekly</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.periodButton,
                        period === 'Monthly' && styles.activePeriodButton,
                        period === 'Monthly' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setPeriod('Monthly')}
                >
                    <Text style={[
                        styles.periodButtonText,
                        period === 'Monthly' && styles.activePeriodText
                    ]}>Monthly</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.periodButton,
                        period === 'Yearly' && styles.activePeriodButton,
                        period === 'Yearly' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setPeriod('Yearly')}
                >
                    <Text style={[
                        styles.periodButtonText,
                        period === 'Yearly' && styles.activePeriodText
                    ]}>Yearly</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.budgetListHeader}>
                <Text style={[styles.budgetListTitle, { color: theme.text }]}>Budget Categories</Text>
                <TouchableOpacity onPress={handleAddBudget}>
                    <Ionicons name="add-circle" size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const handleSave = () => {
        updateBudget(selectedBudget);
        setShowEditModal(false);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Remove the header section and use the navigation header instead */}

            {budgets.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="wallet-outline" size={80} color={theme.textSecondary} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                        No budgets yet
                    </Text>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: theme.primary }]}
                        onPress={handleAddBudget}
                    >
                        <Text style={styles.addButtonText}>Create Budget</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filterBudgetsByPeriod()}
                    renderItem={({ item }) => (
                        <BudgetItem
                            budget={item}
                            spent={getBudgetRemaining(item.id)}
                            onEdit={() => handleEditBudget(item)}
                            onDelete={() => handleDeleteBudget(item.id)}
                            theme={theme}
                        />
                    )}
                    keyExtractor={item => item.id.toString()}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Budget Form Modal */}
            <BudgetForm
                visible={showAddModal}
                budget={editingBudget}
                onClose={() => setShowAddModal(false)}
                defaultPeriod={period}
                theme={theme}
            />

            {/* Budget Goal Form Modal */}
            <BudgetGoalForm
                visible={showGoalModal}
                onClose={() => setShowGoalModal(false)}
                period={period}
                theme={theme}
            />

            {/* Edit Budget Modal */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={showEditModal}
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalContent}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Budget</Text>
                    <Picker
                        selectedValue={selectedBudget?.category}
                        onValueChange={(itemValue) => setSelectedBudget({ ...selectedBudget, category: itemValue })}
                        style={styles.picker}
                    >
                        <Picker.Item label="Food" value="Food" />
                        <Picker.Item label="Transport" value="Transport" />
                        <Picker.Item label="Utilities" value="Utilities" />
                    </Picker>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={[styles.saveButton, { backgroundColor: theme.primary }]}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 18,
        marginVertical: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginVertical: 10,
    },
    budgetItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    headerContainer: {
        marginBottom: 20,
    },
    budgetGoalCard: {
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
    },
    budgetGoalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    budgetGoalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    budgetGoalInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    goalColumn: {
        flex: 1,
        alignItems: 'center',
    },
    goalAmount: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    goalLabel: {
        fontSize: 14,
    },
    progressContainer: {
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
        marginTop: 10,
    },
    progressBar: {
        height: '100%',
        borderRadius: 5,
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
    },
    periodSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    periodButton: {
        flex: 1,
        alignItems: 'center',
        padding: 10,
        borderRadius: 5,
        marginHorizontal: 5,
    },
    activePeriodButton: {
        borderWidth: 2,
        borderColor: 'transparent',
    },
    periodButtonText: {
        fontSize: 16,
    },
    activePeriodText: {
        fontWeight: 'bold',
    },
    budgetListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    budgetListTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        marginTop: 10,
    },
    addButton: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 100,
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    picker: {
        width: '100%',
        height: 150,
        marginBottom: 20,
    },
    saveButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        width: '100%',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

