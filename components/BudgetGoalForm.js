import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseContext } from '../context/DatabaseContext';
import { PreferencesContext } from '../context/PreferencesContext';

export default function BudgetGoalForm({ visible, onClose, period, theme }) {
    const { budgets, updateBudgetGoal, getTotalBudget } = useContext(DatabaseContext);
    const { currency } = useContext(PreferencesContext);
    const [totalBudget, setTotalBudget] = useState('');

    useEffect(() => {
        if (visible) {
            setTotalBudget(getTotalBudget(period).toString());
        }
    }, [visible, period]);

    const handleSave = () => {
        if (!totalBudget || isNaN(parseFloat(totalBudget)) || parseFloat(totalBudget) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        updateBudgetGoal(parseFloat(totalBudget), period);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Set {period} Budget Goal</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formContainer}>
                        <Text style={[styles.label, { color: theme.text }]}>Total Budget Amount ({currency})</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                            placeholder="0.00"
                            placeholderTextColor={theme.placeholder}
                            keyboardType="numeric"
                            value={totalBudget}
                            onChangeText={setTotalBudget}
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.primary }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        borderRadius: 12,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    formContainer: {
        marginBottom: 10,
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
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
