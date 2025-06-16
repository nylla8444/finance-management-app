import React, { useState, useContext } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Switch,
    ScrollView,
    Alert,
    Modal,
    ActivityIndicator,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PreferencesContext } from '../context/PreferencesContext';
import { DatabaseContext } from '../context/DatabaseContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const CURRENCIES = [
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export default function SettingsScreen() {
    const {
        darkMode,
        toggleDarkMode,
        currency,
        changeCurrency,
        theme
    } = useContext(PreferencesContext);

    const {
        assets,
        transactions,
        budgets,
        db,
        loadAssets,
        loadTransactions,
        loadBudgets,
        getTransactionHistory
    } = useContext(DatabaseContext);

    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Export app data to a JSON file
    const exportData = async () => {
        try {
            setIsExporting(true);

            // Gather all data
            const appData = {
                assets,
                transactions,
                budgets,
                preferences: {
                    currency,
                    darkMode
                },
                exportDate: new Date().toISOString()
            };

            // Convert to JSON
            const jsonData = JSON.stringify(appData, null, 2);

            // Create file
            const fileName = `financial_app_export_${new Date().toISOString().split('T')[0]}.json`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(filePath, jsonData);

            // Share file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath);
            } else {
                Alert.alert(
                    "Sharing not available",
                    "Sharing is not available on this device"
                );
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            Alert.alert(
                "Export Failed",
                "There was an error exporting your data. Please try again."
            );
        } finally {
            setIsExporting(false);
        }
    };

    // Import data from a JSON file
    const importData = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true
            });

            if (result.canceled) {
                return;
            }

            setIsImporting(true);

            // Read file content
            const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
            const importedData = JSON.parse(fileContent);

            // Validate imported data
            if (!importedData || !importedData.assets || !importedData.transactions || !importedData.budgets) {
                throw new Error('Invalid data format');
            }

            // Confirm import
            Alert.alert(
                "Import Data",
                "This will replace all your current data. Do you want to continue?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Import",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                // Clear existing data
                                await clearAllData();

                                // Import assets
                                for (const asset of importedData.assets) {
                                    await db.runAsync(
                                        'INSERT INTO assets (name, amount, currency, image) VALUES (?, ?, ?, ?)',
                                        [asset.name, asset.amount, asset.currency, asset.image]
                                    );
                                }

                                // Import transactions
                                for (const transaction of importedData.transactions) {
                                    await db.runAsync(
                                        'INSERT INTO transactions (type, amount, category, description, location, date) VALUES (?, ?, ?, ?, ?, ?)',
                                        [
                                            transaction.type,
                                            transaction.amount,
                                            transaction.category,
                                            transaction.description,
                                            transaction.location,
                                            transaction.date
                                        ]
                                    );
                                }

                                // Import budgets
                                for (const budget of importedData.budgets) {
                                    await db.runAsync(
                                        'INSERT INTO budgets (category, amount, period, spent) VALUES (?, ?, ?, ?)',
                                        [budget.category, budget.amount, budget.period, budget.spent]
                                    );
                                }

                                // Import preferences
                                if (importedData.preferences) {
                                    if (importedData.preferences.currency) {
                                        changeCurrency(importedData.preferences.currency);
                                    }

                                    if (importedData.preferences.darkMode !== undefined &&
                                        importedData.preferences.darkMode !== darkMode) {
                                        toggleDarkMode();
                                    }
                                }

                                // Reload data
                                await loadAssets();
                                await loadTransactions();
                                await loadBudgets();

                                Alert.alert(
                                    "Import Successful",
                                    "Your data has been imported successfully."
                                );
                            } catch (error) {
                                console.error('Error importing data:', error);
                                Alert.alert(
                                    "Import Failed",
                                    "There was an error importing your data. Please try again."
                                );
                            } finally {
                                setIsImporting(false);
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error importing data:', error);
            Alert.alert(
                "Import Failed",
                "There was an error importing your data. Please try again."
            );
            setIsImporting(false);
        }
    };

    // Clear all data
    const clearAllData = async () => {
        try {
            // Delete all data from tables
            await db.execAsync('DELETE FROM assets');
            await db.execAsync('DELETE FROM transactions');
            await db.execAsync('DELETE FROM budgets');

            // Reset SQLite autoincrement counters
            await db.execAsync('DELETE FROM sqlite_sequence WHERE name="assets"');
            await db.execAsync('DELETE FROM sqlite_sequence WHERE name="transactions"');
            await db.execAsync('DELETE FROM sqlite_sequence WHERE name="budgets"');

            // Reload data
            await loadAssets();
            await loadTransactions();
            await loadBudgets();

            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    };

    // Handle delete all data
    const handleDeleteAllData = () => {
        Alert.alert(
            "Delete All Data",
            "This will permanently delete all your data. This action cannot be undone. Are you sure you want to continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const success = await clearAllData();
                        if (success) {
                            Alert.alert(
                                "Data Deleted",
                                "All your data has been deleted successfully."
                            );
                        } else {
                            Alert.alert(
                                "Error",
                                "There was an error deleting your data. Please try again."
                            );
                        }
                    }
                }
            ]
        );
    };

    // Load transaction history when modal opens
    const openHistoryModal = async () => {
        const history = await getTransactionHistory();
        setTransactionHistory(history);
        setShowHistoryModal(true);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView style={styles.scrollView}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>

                {/* Currency Selection */}
                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={() => setShowCurrencyModal(true)}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="cash-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Currency</Text>
                    </View>
                    <View style={styles.settingRight}>
                        <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                            {CURRENCIES.find(c => c.code === currency)?.symbol} {currency}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Dark Mode Toggle */}
                <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
                    <View style={styles.settingLeft}>
                        <Ionicons
                            name={darkMode ? "moon" : "sunny-outline"}
                            size={24}
                            color={theme.primary}
                            style={styles.settingIcon}
                        />
                        <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#767577", true: theme.primary }}
                        thumbColor="#f4f3f4"
                        ios_backgroundColor="#3e3e3e"
                        onValueChange={toggleDarkMode}
                        value={darkMode}
                    />
                </View>

                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 30 }]}>Data Management</Text>

                {/* Export Data */}
                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={exportData}
                    disabled={isExporting}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="download-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Export Data</Text>
                    </View>
                    {isExporting ? (
                        <ActivityIndicator color={theme.primary} />
                    ) : (
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    )}
                </TouchableOpacity>

                {/* Import Data */}
                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={importData}
                    disabled={isImporting}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Import Data</Text>
                    </View>
                    {isImporting ? (
                        <ActivityIndicator color={theme.primary} />
                    ) : (
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    )}
                </TouchableOpacity>

                {/* Delete All Data */}
                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={handleDeleteAllData}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="trash-outline" size={24} color="#FF3B30" style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: "#FF3B30" }]}>Delete All Data</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* Transaction History section */}
                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 30 }]}>Transaction History</Text>

                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={openHistoryModal}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="time-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>View Transaction History</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* About Section */}
                <View style={styles.aboutSection}>
                    <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
                        Developed by: nylla
                    </Text>
                    <Text style={[styles.versionText, { color: theme.textSecondary }]}>
                        Version 1.0
                    </Text>
                </View>
            </ScrollView>

            {/* Currency Selection Modal */}
            <Modal
                visible={showCurrencyModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCurrencyModal(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Currency</Text>
                            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={CURRENCIES}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.currencyItem,
                                        {
                                            borderBottomColor: theme.border,
                                            backgroundColor: currency === item.code ?
                                                theme.primary + '20' : 'transparent'
                                        }
                                    ]}
                                    onPress={() => {
                                        changeCurrency(item.code);
                                        setShowCurrencyModal(false);
                                    }}
                                >
                                    <Text style={[styles.currencySymbol, { color: theme.text }]}>
                                        {item.symbol}
                                    </Text>
                                    <View style={styles.currencyInfo}>
                                        <Text style={[styles.currencyCode, { color: theme.text }]}>
                                            {item.code}
                                        </Text>
                                        <Text style={[styles.currencyName, { color: theme.textSecondary }]}>
                                            {item.name}
                                        </Text>
                                    </View>
                                    {currency === item.code && (
                                        <Ionicons name="checkmark" size={24} color={theme.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Transaction History Modal */}
            <Modal
                visible={showHistoryModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowHistoryModal(false)}
            >
                <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Transaction History</Text>
                        <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {transactionHistory.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No transaction history available
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={transactionHistory}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <View style={[styles.historyItem, { borderBottomColor: theme.border }]}>
                                    <View style={styles.historyHeader}>
                                        <Text style={[styles.historyAction, { color: theme.primary }]}>
                                            {item.action === 'delete' ? 'Deleted' : 'Restored'}
                                        </Text>
                                        <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                                            {new Date(item.timestamp).toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={styles.historyDetails}>
                                        <Text style={[styles.historyText, { color: theme.text }]}>
                                            {item.data.type === 'expense' ? 'Expense: ' : 'Income: '}
                                            {currency} {parseFloat(item.data.amount).toFixed(2)}
                                        </Text>
                                        <Text style={[styles.historyText, { color: theme.text }]}>
                                            Category: {item.data.category}
                                        </Text>
                                        {item.data.description && (
                                            <Text style={[styles.historyText, { color: theme.text }]}>
                                                Description: {item.data.description}
                                            </Text>
                                        )}
                                        <Text style={[styles.historyText, { color: theme.text }]}>
                                            Account: {item.data.location}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingIcon: {
        marginRight: 12,
    },
    settingText: {
        fontSize: 16,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingValue: {
        fontSize: 16,
        marginRight: 8,
    },
    aboutSection: {
        marginTop: 40,
        alignItems: 'center',
        paddingBottom: 30,
    },
    aboutText: {
        fontSize: 14,
        marginBottom: 8,
    },
    versionText: {
        fontSize: 14,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        padding: 20,
        paddingBottom: 0,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',

    },
    currencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    currencySymbol: {
        fontSize: 20,
        fontWeight: 'bold',
        width: 40,
        textAlign: 'center',
    },
    currencyInfo: {
        flex: 1,
        marginLeft: 12,
    },
    currencyCode: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    currencyName: {
        fontSize: 14,
        marginTop: 4,
    },
    historyItem: {
        padding: 16,
        borderBottomWidth: 1,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    historyAction: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    historyDate: {
        fontSize: 14,
    },
    historyDetails: {
        marginLeft: 8,
    },
    historyText: {
        fontSize: 14,
        marginBottom: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
