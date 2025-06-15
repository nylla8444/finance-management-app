// filepath: c:\Users\ledes\Documents\expo_test\financial-management-app\screens\TransactionForm.js
import React, { useState } from 'react';
import { View, Text, Button, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const TransactionForm = ({ visible, onClose, onSubmit, transaction }) => {
    const [amount, setAmount] = useState(transaction ? transaction.amount : '');
    const [category, setCategory] = useState(transaction ? transaction.category : '');
    const [description, setDescription] = useState(transaction ? transaction.description : '');
    const [location, setLocation] = useState(transaction ? transaction.location : '');
    const [date, setDate] = useState(transaction ? new Date(transaction.date) : new Date());
    const [showPicker, setShowPicker] = useState(false);

    const handleSubmit = () => {
        onSubmit({ amount, category, description, location, date });
        onClose();
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>{transaction ? 'Edit Transaction' : 'Add Transaction'}</Text>
                    <TextInput
                        placeholder="Amount"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={() => setShowPicker(true)}>
                        <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    {showPicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowPicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    )}
                    <Picker
                        selectedValue={category}
                        onValueChange={(itemValue) => setCategory(itemValue)}
                    >
                        <Picker.Item label="Select Category" value="" />
                        <Picker.Item label="Food" value="Food" />
                        <Picker.Item label="Transport" value="Transport" />
                        <Picker.Item label="Entertainment" value="Entertainment" />
                    </Picker>
                    <TextInput
                        placeholder="Description"
                        value={description}
                        onChangeText={setDescription}
                    />
                    <TextInput
                        placeholder="Location"
                        value={location}
                        onChangeText={setLocation}
                    />
                    <Button title="Submit" onPress={handleSubmit} />
                    <Button title="Cancel" onPress={onClose} />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        elevation: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    dateText: {
        fontSize: 16,
        marginVertical: 10,
    },
});

export default TransactionForm;