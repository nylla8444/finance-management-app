import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

// Transaction categories
const CATEGORIES = {
    income: ['Salary', 'Investments', 'Gifts', 'Other Income'],
    expense: ['Food', 'Housing', 'Transportation', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Education', 'Other Expenses']
};

export default function TransactionForm({ visible, onClose, onSave, transaction, assets, theme }) {
    // Initialize state with default values or values from transaction if editing
    const [type, setType] = useState(transaction?.type || 'expense');
    const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
    const [category, setCategory] = useState(transaction?.category || '');
    const [description, setDescription] = useState(transaction?.description || '');
    const [location, setLocation] = useState(transaction?.location || (assets.length > 0 ? assets[0].name : ''));
    const [date, setDate] = useState(transaction?.date ? new Date(transaction.date) : new Date());

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);

    // Update form when transaction changes
    useEffect(() => {
        if (transaction) {
            setType(transaction.type || 'expense');
            setAmount(transaction.amount?.toString() || '');
            setCategory(transaction.category || '');
            setDescription(transaction.description || '');
            setLocation(transaction.location || '');
            setDate(transaction.date ? new Date(transaction.date) : new Date());
        } else {
            // Reset form for new transaction
            setType('expense');
            setAmount('');
            setCategory('');
            setDescription('');
            setLocation(assets.length > 0 ? assets[0].name : '');
            setDate(new Date());
        }
    }, [transaction, visible]);

    // Add a useEffect to reset category when type changes
    useEffect(() => {
        setCategory(''); // Reset category when type changes
    }, [type]);

    const handleSave = () => {
        // Validate form inputs
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount greater than zero');
            return;
        }

        if (type === 'expense' && !category) {
            Alert.alert('Error', 'Please select a category for expense');
            return;
        } else if (type === 'income' && !category) {
            Alert.alert('Error', 'Please select a category for income');
            return;
        }

        if (!location) {
            Alert.alert('Error', 'Please select a location/asset');
            return;
        }

        // Prepare transaction data
        const transactionData = {
            type: type.toLowerCase(), // Normalize type to lowercase
            amount: parseFloat(amount),
            category,
            description: description || '',
            location,
            date: date.toISOString(),
            ...(transaction && transaction.id ? { id: transaction.id } : {})
        };

        // Save and close
        onSave(transactionData);
    };

    // Handle date change
    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    // Determine theme-based colors with fallbacks
    const textColor = theme?.text || '#000';
    const backgroundColor = theme?.background || '#fff';
    const cardColor = theme?.card || '#f5f5f5';
    const borderColor = theme?.border || '#ccc';
    const primaryColor = theme?.primary || '#007BFF';
    const placeholderColor = theme?.placeholder || '#999';

    // Determine if we're in edit mode
    const isEditMode = !!transaction?.id;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: textColor }]}>
                            {isEditMode ? `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}` : 'Add Transaction'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formContainer}>
                        {/* Transaction Type Selector - Disabled in edit mode */}
                        <View style={[styles.typeSelector, isEditMode && styles.disabledTypeSelector]}>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    type === 'income' && styles.activeTypeButton,
                                    type === 'income' && { backgroundColor: '#4CAF50' },
                                    isEditMode && styles.editModeTypeButton
                                ]}
                                onPress={() => !isEditMode && setType('income')}
                                disabled={isEditMode}
                            >
                                <Ionicons
                                    name="arrow-down"
                                    size={20}
                                    color={type === 'income' ? 'white' : (isEditMode ? '#aaa' : '#666')}
                                />
                                <Text style={[
                                    styles.typeButtonText,
                                    type === 'income' && styles.activeTypeButtonText,
                                    isEditMode && type !== 'income' && styles.disabledTypeText
                                ]}>Income</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    type === 'expense' && styles.activeTypeButton,
                                    type === 'expense' && { backgroundColor: '#FF6B6B' },
                                    isEditMode && styles.editModeTypeButton
                                ]}
                                onPress={() => !isEditMode && setType('expense')}
                                disabled={isEditMode}
                            >
                                <Ionicons
                                    name="arrow-up"
                                    size={20}
                                    color={type === 'expense' ? 'white' : (isEditMode ? '#aaa' : '#666')}
                                />
                                <Text style={[
                                    styles.typeButtonText,
                                    type === 'expense' && styles.activeTypeButtonText,
                                    isEditMode && type !== 'expense' && styles.disabledTypeText
                                ]}>Expense</Text>
                            </TouchableOpacity>
                        </View>

                        {isEditMode && (
                            <Text style={[styles.editModeNotice, { color: textColor }]}>
                                Transaction type cannot be changed when editing
                            </Text>
                        )}

                        {/* Amount Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: textColor }]}>Amount</Text>
                            <TextInput
                                style={[styles.input, { color: textColor, borderColor, backgroundColor: cardColor }]}
                                placeholder="0.00"
                                placeholderTextColor={placeholderColor}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>

                        {/* Category Selector */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: textColor }]}>Category</Text>
                            <TouchableOpacity
                                style={[styles.pickerButton, { borderColor, backgroundColor: cardColor }]}
                                onPress={() => setShowCategoryPicker(true)}
                            >
                                <Text style={{ color: category ? textColor : placeholderColor }}>
                                    {category || 'Select category'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Date Selector */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: textColor }]}>Date</Text>
                            <TouchableOpacity
                                style={[styles.pickerButton, { borderColor, backgroundColor: cardColor }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: textColor }}>
                                    {date.toLocaleDateString()}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color={textColor} />
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                />
                            )}
                        </View>

                        {/* Location/Asset Selector */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: textColor }]}>Asset/Account</Text>
                            <TouchableOpacity
                                style={[styles.pickerButton, { borderColor, backgroundColor: cardColor }]}
                                onPress={() => setShowLocationPicker(true)}
                            >
                                <Text style={{ color: location ? textColor : placeholderColor }}>
                                    {location || 'Select asset/account'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Description Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: textColor }]}>Description (Optional)</Text>
                            <TextInput
                                style={[styles.input, { color: textColor, borderColor, backgroundColor: cardColor }]}
                                placeholder="Add description"
                                placeholderTextColor={placeholderColor}
                                value={description}
                                onChangeText={setDescription}
                                multiline={true}
                                numberOfLines={3}
                            />
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.buttonContainer}>
                            {transaction && (
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => {
                                        onSave({ ...transaction, delete: true });
                                    }}
                                >
                                    <Text style={styles.deleteButtonText}>Delete</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: primaryColor }]}
                                onPress={handleSave}
                            >
                                <Text style={styles.saveButtonText}>
                                    {transaction ? 'Update' : 'Add'} Transaction
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>

            {/* Category Picker Modal */}
            <Modal
                visible={showCategoryPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCategoryPicker(false)}
            >
                <View style={styles.pickerModalOverlay}>
                    <View style={[styles.pickerModalContent, { backgroundColor }]}>
                        <View style={styles.pickerHeader}>
                            <Text style={[styles.pickerTitle, { color: textColor }]}>
                                Select {type.charAt(0).toUpperCase() + type.slice(1)} Category
                            </Text>
                            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                                <Ionicons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {CATEGORIES[type].map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryOption,
                                        category === cat && { backgroundColor: cardColor }
                                    ]}
                                    onPress={() => {
                                        setCategory(cat);
                                        setShowCategoryPicker(false);
                                    }}
                                >
                                    <Text style={{ color: textColor }}>{cat}</Text>
                                    {category === cat && (
                                        <Ionicons name="checkmark" size={20} color={primaryColor} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Location Picker Modal */}
            <Modal
                visible={showLocationPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLocationPicker(false)}
            >
                <View style={styles.pickerModalOverlay}>
                    <View style={[styles.pickerModalContent, { backgroundColor }]}>
                        <View style={styles.pickerHeader}>
                            <Text style={[styles.pickerTitle, { color: textColor }]}>Select Asset</Text>
                            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                                <Ionicons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                        </View>
                        {assets.length > 0 ? (
                            <ScrollView>
                                {assets.map((asset) => (
                                    <TouchableOpacity
                                        key={asset.id.toString()}
                                        style={[
                                            styles.categoryOption,
                                            location === asset.name && { backgroundColor: cardColor }
                                        ]}
                                        onPress={() => {
                                            setLocation(asset.name);
                                            setShowLocationPicker(false);
                                        }}
                                    >
                                        <Text style={{ color: textColor }}>{asset.name}</Text>
                                        {location === asset.name && (
                                            <Ionicons name="checkmark" size={20} color={primaryColor} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyPickerMessage}>
                                <Text style={{ color: textColor, textAlign: 'center' }}>
                                    No assets available. Please add an asset first.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    formContainer: {
        display: 'flex',
    },
    typeSelector: {
        flexDirection: 'row',
        marginBottom: 20,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 8,
        backgroundColor: '#f0f0f0',
    },
    activeTypeButton: {
        backgroundColor: '#007BFF',
    },
    typeButtonText: {
        fontWeight: 'bold',
        color: '#666',
    },
    activeTypeButtonText: {
        color: 'white',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        fontSize: 16,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 48,
    },
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        height: 48,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 30,
    },
    saveButton: {
        flex: 1,
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    deleteButton: {
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        paddingHorizontal: 20,
        backgroundColor: '#FF3B30',
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    pickerModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    pickerModalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 30,
        maxHeight: '50%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyPickerMessage: {
        padding: 20,
        alignItems: 'center',
    },
    categoryOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    disabledTypeSelector: {
        opacity: 0.8,
    },
    editModeTypeButton: {
        opacity: 0.7,
    },
    disabledTypeText: {
        color: '#aaa',
    },
    editModeNotice: {
        textAlign: 'center',
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 15,
    },
});
