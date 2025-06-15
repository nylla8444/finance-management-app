import React, { useState, useContext, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseContext } from '../context/DatabaseContext';
import { PreferencesContext } from '../context/PreferencesContext';
import * as ImagePicker from 'expo-image-picker';

export default function AssetForm({ visible, asset, onClose, onSave }) {
    const { theme, currency } = useContext(PreferencesContext);

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [image, setImage] = useState(null);

    // Initialize form when asset changes or modal becomes visible
    useEffect(() => {
        if (visible) {
            if (asset) {
                // Editing an existing asset
                setName(asset.name);
                setAmount(asset.amount.toString());
                setImage(asset.image);
            } else {
                // Adding a new asset
                resetForm();
            }
        }
    }, [asset, visible]);

    const resetForm = () => {
        setName('');
        setAmount('');
        setImage(null);
    };

    const handleSave = () => {
        // Validate inputs
        if (!name.trim() || !amount.trim() || isNaN(parseFloat(amount))) {
            Alert.alert('Error', 'Please enter valid name and amount');
            return;
        }

        const assetData = {
            name,
            amount: parseFloat(amount),
            currency,
            image: image || ''
        };

        // If editing, include the ID
        if (asset) {
            assetData.id = asset.id;
        }

        onSave(assetData);
        onClose();
    };

    // Pick image
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    return (
        <Modal
            animationType="slide" // Changed from "fade" to "slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            {asset ? 'Edit Asset' : 'Add New Asset'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalForm}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Asset Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            placeholder="e.g. Bank Account, Wallet, Investments"
                            placeholderTextColor={theme.border}
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={[styles.inputLabel, { color: theme.text }]}>Amount</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            placeholder="0.00"
                            placeholderTextColor={theme.border}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                        />

                        <Text style={[styles.inputLabel, { color: theme.text }]}>Image (Optional)</Text>
                        <TouchableOpacity
                            style={[styles.imagePicker, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={pickImage}
                        >
                            {image ? (
                                <Image source={{ uri: image }} style={styles.previewImage} />
                            ) : (
                                <>
                                    <Ionicons name="image-outline" size={32} color={theme.primary} />
                                    <Text style={[styles.imagePickerText, { color: theme.text }]}>
                                        Tap to select an image
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.buttonRow}>
                            {asset && (
                                <TouchableOpacity
                                    style={[styles.deleteButton, { backgroundColor: '#FF3B30' }]}
                                    onPress={() => {
                                        Alert.alert(
                                            'Confirm Delete',
                                            `Are you sure you want to delete ${asset.name}?`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Delete',
                                                    onPress: () => {
                                                        onSave({ delete: true, id: asset.id });
                                                        onClose();
                                                    },
                                                    style: 'destructive'
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <Text style={styles.buttonText}>Delete</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                                onPress={handleSave}
                            >
                                <Text style={styles.buttonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
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
    modalForm: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderRadius: 8,
        borderWidth: 1,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    imagePicker: {
        height: 120,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    imagePickerText: {
        marginTop: 8,
        fontSize: 14,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    saveButton: {
        flex: 1,
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        paddingHorizontal: 20,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
