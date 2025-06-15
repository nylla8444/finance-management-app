// filepath: c:\Users\ledes\Documents\expo_test\financial-management-app\screens\Transactions.js
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Button, TextInput, Picker, StyleSheet } from 'react-native';
import { DatabaseContext } from '../context/DatabaseContext';

const Transactions = () => {
    const { transactions, loadTransactions, addTransaction } = useContext(DatabaseContext);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [type, setType] = useState('Expense'); // Default type

    useEffect(() => {
        loadTransactions();
    }, []);

    const handleAddTransaction = () => {
        addTransaction({ amount, category, description, location, type });
        setAmount('');
        setCategory('');
        setDescription('');
        setLocation('');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add Transaction</Text>
            <TextInput
                placeholder="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.input}
            />
            <Picker
                selectedValue={type}
                onValueChange={(itemValue) => setType(itemValue)}
                style={styles.picker}
            >
                <Picker.Item label="Expense" value="Expense" />
                <Picker.Item label="Income" value="Income" />
            </Picker>
            <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
            >
                <Picker.Item label="Select Category" value="" />
                <Picker.Item label="Food" value="Food" />
                <Picker.Item label="Transport" value="Transport" />
                <Picker.Item label="Salary" value="Salary" />
                <Picker.Item label="Other" value="Other" />
            </Picker>
            <TextInput
                placeholder="Description (Optional)"
                value={description}
                onChangeText={setDescription}
                style={styles.input}
            />
            <TextInput
                placeholder="Location"
                value={location}
                onChangeText={setLocation}
                style={styles.input}
            />
            <Button title="Add Transaction" onPress={handleAddTransaction} />
            <Text style={styles.title}>Transactions List</Text>
            {transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                    <Text>{transaction.type}: {transaction.amount} - {transaction.category}</Text>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 10 },
    picker: { height: 50, width: '100%', marginVertical: 10 },
    transactionItem: { marginVertical: 5 },
});

export default Transactions;