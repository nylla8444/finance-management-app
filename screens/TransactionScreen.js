// filepath: c:\Users\ledes\Documents\expo_test\financial-management-app\screens\TransactionScreen.js
import React, { useState, useContext, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DatabaseContext } from '../context/DatabaseContext';
import TransactionForm from '../components/TransactionForm';

export default function TransactionScreen() {
    const { transactions, loadTransactions } = useContext(DatabaseContext);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    useEffect(() => {
        loadTransactions();
    }, []);

    const handleAddTransaction = () => {
        setEditingTransaction(null);
        setModalVisible(true);
    };

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Transactions</Text>
            <TouchableOpacity onPress={handleAddTransaction} style={styles.addButton}>
                <Text style={styles.addButtonText}>Add Transaction</Text>
            </TouchableOpacity>

            <ScrollView>
                {transactions.map((transaction) => (
                    <TouchableOpacity key={transaction.id} onPress={() => handleEditTransaction(transaction)}>
                        <Text style={styles.transactionItem}>{transaction.description}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TransactionForm
                            transaction={editingTransaction}
                            onClose={() => setModalVisible(false)}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    addButton: {
        backgroundColor: '#007BFF',
        padding: 10,
        borderRadius: 5,
        marginBottom: 20,
    },
    addButtonText: {
        color: '#fff',
        textAlign: 'center',
    },
    transactionItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
    },
});
