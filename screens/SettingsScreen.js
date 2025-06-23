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
    FlatList,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PreferencesContext } from '../context/PreferencesContext';
import { DatabaseContext } from '../context/DatabaseContext';
import ArchiveManager from '../components/ArchiveManager';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';

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

const ARCHIVE_PERIODS = [
    { value: 3, label: '3 months' },
    { value: 6, label: '6 months' },
    { value: 12, label: '12 months' },
    { value: 24, label: '24 months' },
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
        getTransactionHistory,
        archiveSettings,
        updateArchiveSettings,
        autoArchiveOldTransactions,
        getArchivedTransactionsCount
    } = useContext(DatabaseContext);

    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [showArchivePeriodModal, setShowArchivePeriodModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showArchiveManager, setShowArchiveManager] = useState(false);
    const [archivedCount, setArchivedCount] = useState(0);
    const [storageStats, setStorageStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);

    // Load archived count when component mounts
    React.useEffect(() => {
        loadArchivedCount();
    }, []);

    const loadArchivedCount = async () => {
        const count = await getArchivedTransactionsCount();
        setArchivedCount(count);
    };

    // Toggle auto-archive setting
    const toggleAutoArchive = async () => {
        const newSettings = {
            ...archiveSettings,
            autoArchive: !archiveSettings.autoArchive
        };
        await updateArchiveSettings(newSettings);
    };

    // Update archive period
    const updateArchivePeriod = async (months) => {
        const newSettings = {
            ...archiveSettings,
            archiveAfterMonths: months
        };
        await updateArchiveSettings(newSettings);
        setShowArchivePeriodModal(false);
    };

    // Manual archive trigger
    const triggerManualArchive = async () => {
        Alert.alert(
            "Archive Old Transactions",
            `This will archive transactions older than ${archiveSettings.archiveAfterMonths} months. Continue?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Archive",
                    onPress: async () => {
                        setIsArchiving(true);
                        try {
                            await autoArchiveOldTransactions();
                            await loadArchivedCount();
                            Alert.alert("Success", "Old transactions have been archived.");
                        } catch (error) {
                            Alert.alert("Error", "Failed to archive transactions. Please try again.");
                        } finally {
                            setIsArchiving(false);
                        }
                    }
                }
            ]
        );
    };

    // Enhanced function to show detailed file system information
    const showFileSystemInfo = async () => {
        try {
            const info = {
                documentDirectory: FileSystem.documentDirectory,
                cacheDirectory: FileSystem.cacheDirectory,
            };

            // Get platform-specific information
            if (Platform.OS === 'android') {
                info.platform = 'Android';
                info.note = 'On Android, app documents are typically stored in: /data/data/[app.package.name]/files/';
            } else if (Platform.OS === 'ios') {
                info.platform = 'iOS';
                info.note = 'On iOS, app documents are in the app sandbox Documents folder';
            }

            // Try to get more specific path information
            try {
                const documentPath = FileSystem.documentDirectory;
                info.resolvedDocumentPath = documentPath;

                // Try to get the actual file system path if possible
                if (documentPath.startsWith('file://')) {
                    info.actualPath = documentPath.replace('file://', '');
                }
            } catch (error) {
                info.pathError = error.message;
            }

            // Try to list files in document directory
            try {
                const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
                info.filesInDocumentDirectory = files;

                // Get info about exported files specifically
                const exportedFiles = files.filter(file => file.startsWith('financial_app_export_'));
                if (exportedFiles.length > 0) {
                    info.exportedFiles = [];
                    for (const file of exportedFiles) {
                        const filePath = `${FileSystem.documentDirectory}${file}`;
                        try {
                            const fileInfo = await FileSystem.getInfoAsync(filePath);
                            info.exportedFiles.push({
                                name: file,
                                fullPath: filePath,
                                actualPath: filePath.replace('file://', ''),
                                exists: fileInfo.exists,
                                size: fileInfo.size,
                                modificationTime: fileInfo.modificationTime
                            });
                        } catch (error) {
                            info.exportedFiles.push({
                                name: file,
                                error: error.message
                            });
                        }
                    }
                }
            } catch (error) {
                info.filesError = error.message;
            }

            // Try to check external storage permissions and paths (Android)
            try {
                const { status } = await MediaLibrary.getPermissionsAsync();
                info.mediaLibraryPermission = status;

                if (status === 'granted') {
                    try {
                        const albums = await MediaLibrary.getAlbumsAsync();
                        const downloadAlbum = albums.find(album => album.title === 'Download');
                        if (downloadAlbum) {
                            info.downloadAlbumId = downloadAlbum.id;
                            info.downloadAlbumAssetCount = downloadAlbum.assetCount;
                        }
                    } catch (error) {
                        info.albumError = error.message;
                    }
                }
            } catch (error) {
                info.mediaLibraryError = error.message;
            }

            Alert.alert(
                "File System Information",
                JSON.stringify(info, null, 2),
                [
                    { text: "Copy to Clipboard", onPress: () => copyToClipboard(JSON.stringify(info, null, 2)) },
                    { text: "OK" }
                ]
            );
        } catch (error) {
            Alert.alert("Error", `Failed to get file system info: ${error.message}`);
        }
    };

    // Helper function to copy text to clipboard (you might need to install expo-clipboard)
    const copyToClipboard = (text) => {
        // This would require expo-clipboard package
        // For now, just show an alert
        Alert.alert("Info", "File system information logged to console");
        console.log("File System Info:", text);
    };

    // Enhanced export function with better path reporting
    const exportData = async (shareFile = true) => {
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
            const actualPath = filePath.replace('file://', '');

            // Write file to app directory first
            await FileSystem.writeAsStringAsync(filePath, jsonData, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            // Verify file was created
            const fileInfo = await FileSystem.getInfoAsync(filePath);

            if (shareFile) {
                // Share file approach
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(filePath, {
                        mimeType: 'application/json',
                        dialogTitle: 'Export Financial Data'
                    });
                } else {
                    Alert.alert(
                        "Export Complete",
                        `Data exported successfully!\n\nFile: ${fileName}\nApp Path: ${FileSystem.documentDirectory}\nFull Path: ${actualPath}\nFile Size: ${fileInfo.size} bytes\n\nNote: File is saved in app's private storage.`,
                        [{ text: "OK" }]
                    );
                }
            } else {
                // Save to Downloads approach
                const { status } = await MediaLibrary.requestPermissionsAsync();

                if (status === 'granted') {
                    try {
                        // Create asset and save to Downloads
                        const asset = await MediaLibrary.createAssetAsync(filePath);
                        const album = await MediaLibrary.getAlbumAsync('Download');

                        if (album == null) {
                            await MediaLibrary.createAlbumAsync('Download', asset, false);
                        } else {
                            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                        }

                        Alert.alert(
                            "Export Complete",
                            `Data saved successfully!\n\nFile: ${fileName}\nSaved to: Downloads folder\nApp Storage: ${actualPath}\nFile Size: ${fileInfo.size} bytes\n\nThe file is now accessible through your device's Downloads folder and file manager.`,
                            [{ text: "OK" }]
                        );
                    } catch (mediaError) {
                        console.warn('Media library error:', mediaError);
                        // Fallback to app directory
                        Alert.alert(
                            "Export Complete",
                            `Data saved to app storage!\n\nFile: ${fileName}\nLocation: ${actualPath}\nFile Size: ${fileInfo.size} bytes\n\nNote: Could not access Downloads folder. In Expo Go, files are saved to app's private storage only.`,
                            [{ text: "OK" }]
                        );
                    }
                } else {
                    // Permission denied or not available
                    Alert.alert(
                        "Export Complete",
                        `Data saved to app storage!\n\nFile: ${fileName}\nLocation: ${actualPath}\nFile Size: ${fileInfo.size} bytes\n\nNote: External storage access not available. File saved to app's private storage.`,
                        [{ text: "OK" }]
                    );
                }
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            Alert.alert(
                "Export Failed",
                `There was an error exporting your data: ${error.message}\n\nPlease try again.`
            );
        } finally {
            setIsExporting(false);
        }
    };

    // Add a function to just save locally
    const saveDataLocally = () => exportData(false);

    // Import data from a JSON file
    const importData = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
                multiple: false
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            setIsImporting(true);

            // Read file content with proper encoding
            const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
                encoding: FileSystem.EncodingType.UTF8,
            });

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
                "There was an error importing your data. Please check the file format and try again."
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

    // Calculate database file sizes
    const getDatabaseSizes = async () => {
        try {
            const sizes = {};

            // Get main database file info
            const dbPath = `${FileSystem.documentDirectory}SQLite/financialApp.db`;
            try {
                const dbInfo = await FileSystem.getInfoAsync(dbPath);
                sizes.mainDatabase = {
                    path: dbPath,
                    exists: dbInfo.exists,
                    size: dbInfo.exists ? dbInfo.size : 0,
                    modificationTime: dbInfo.exists ? dbInfo.modificationTime : null
                };
            } catch (error) {
                // Try alternative database locations
                const altPaths = [
                    `${FileSystem.documentDirectory}financialApp.db`,
                    `${FileSystem.documentDirectory}databases/financialApp.db`
                ];

                let found = false;
                for (const altPath of altPaths) {
                    try {
                        const altInfo = await FileSystem.getInfoAsync(altPath);
                        if (altInfo.exists) {
                            sizes.mainDatabase = {
                                path: altPath,
                                exists: true,
                                size: altInfo.size,
                                modificationTime: altInfo.modificationTime
                            };
                            found = true;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }

                if (!found) {
                    sizes.mainDatabase = {
                        path: 'Not found',
                        exists: false,
                        size: 0,
                        modificationTime: null
                    };
                }
            }

            // Try to get WAL and SHM files (SQLite Write-Ahead Logging files)
            const walPath = dbPath + '-wal';
            const shmPath = dbPath + '-shm';

            try {
                const walInfo = await FileSystem.getInfoAsync(walPath);
                sizes.walFile = {
                    path: walPath,
                    exists: walInfo.exists,
                    size: walInfo.exists ? walInfo.size : 0
                };
            } catch (error) {
                sizes.walFile = { path: walPath, exists: false, size: 0 };
            }

            try {
                const shmInfo = await FileSystem.getInfoAsync(shmPath);
                sizes.shmFile = {
                    path: shmPath,
                    exists: shmInfo.exists,
                    size: shmInfo.exists ? shmInfo.size : 0
                };
            } catch (error) {
                sizes.shmFile = { path: shmPath, exists: false, size: 0 };
            }

            return sizes;
        } catch (error) {
            console.error('Error getting database sizes:', error);
            return {};
        }
    };

    // Calculate folder sizes recursively
    const getFolderSize = async (folderPath) => {
        try {
            const info = await FileSystem.getInfoAsync(folderPath);
            if (!info.exists || !info.isDirectory) {
                return { size: 0, fileCount: 0, files: [] };
            }

            const files = await FileSystem.readDirectoryAsync(folderPath);
            let totalSize = 0;
            let fileCount = 0;
            const fileDetails = [];

            for (const file of files) {
                const filePath = `${folderPath}/${file}`;
                try {
                    const fileInfo = await FileSystem.getInfoAsync(filePath);

                    if (fileInfo.exists) {
                        if (fileInfo.isDirectory) {
                            const subFolderStats = await getFolderSize(filePath);
                            totalSize += subFolderStats.size;
                            fileCount += subFolderStats.fileCount;
                            fileDetails.push({
                                name: file,
                                type: 'directory',
                                size: subFolderStats.size,
                                fileCount: subFolderStats.fileCount,
                                path: filePath
                            });
                        } else {
                            totalSize += fileInfo.size;
                            fileCount += 1;
                            fileDetails.push({
                                name: file,
                                type: 'file',
                                size: fileInfo.size,
                                modificationTime: fileInfo.modificationTime,
                                path: filePath
                            });
                        }
                    }
                } catch (fileError) {
                    console.warn(`Error reading file ${filePath}:`, fileError);
                }
            }

            return { size: totalSize, fileCount, files: fileDetails };
        } catch (error) {
            console.error(`Error calculating folder size for ${folderPath}:`, error);
            return { size: 0, fileCount: 0, files: [] };
        }
    };

    // Get comprehensive storage statistics
    const getStorageStatistics = async () => {
        setLoadingStats(true);
        try {
            const stats = {
                timestamp: new Date().toISOString(),
                platform: Platform.OS,
                directories: {},
                databases: {},
                summary: {
                    totalSize: 0,
                    totalFiles: 0
                }
            };

            // Get main directories
            const directories = [
                { name: 'Documents', path: FileSystem.documentDirectory },
                { name: 'Cache', path: FileSystem.cacheDirectory }
            ];

            for (const dir of directories) {
                if (dir.path) {
                    const folderStats = await getFolderSize(dir.path);
                    stats.directories[dir.name] = {
                        path: dir.path,
                        ...folderStats
                    };
                    stats.summary.totalSize += folderStats.size;
                    stats.summary.totalFiles += folderStats.fileCount;
                }
            }

            // Get database specific information
            const dbSizes = await getDatabaseSizes();
            stats.databases = dbSizes;

            // Add database sizes to total
            Object.values(dbSizes).forEach(db => {
                if (db.size) {
                    stats.summary.totalSize += db.size;
                }
            });

            // Get data counts from database
            if (db) {
                try {
                    const assetCount = await db.getAllAsync('SELECT COUNT(*) as count FROM assets');
                    const transactionCount = await db.getAllAsync('SELECT COUNT(*) as count FROM transactions');
                    const budgetCount = await db.getAllAsync('SELECT COUNT(*) as count FROM budgets');
                    const archivedCount = await db.getAllAsync('SELECT COUNT(*) as count FROM archived_transactions');
                    const historyCount = await db.getAllAsync('SELECT COUNT(*) as count FROM transaction_history');

                    stats.dataCounts = {
                        assets: assetCount[0]?.count || 0,
                        transactions: transactionCount[0]?.count || 0,
                        budgets: budgetCount[0]?.count || 0,
                        archived: archivedCount[0]?.count || 0,
                        history: historyCount[0]?.count || 0
                    };
                } catch (dbError) {
                    console.error('Error getting data counts:', dbError);
                    stats.dataCounts = {
                        assets: 0,
                        transactions: 0,
                        budgets: 0,
                        archived: 0,
                        history: 0
                    };
                }
            }

            setStorageStats(stats);
        } catch (error) {
            console.error('Error getting storage statistics:', error);
            Alert.alert('Error', 'Failed to calculate storage statistics');
        } finally {
            setLoadingStats(false);
        }
    };

    // Format file size for display
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Render storage statistics modal
    const renderStorageStatsModal = () => (
        <Modal
            visible={showStorageModal}
            animationType="slide"
            onRequestClose={() => setShowStorageModal(false)}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Storage Statistics</Text>
                    <TouchableOpacity onPress={() => setShowStorageModal(false)}>
                        <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.statsScrollView}>
                    {storageStats && (
                        <>
                            {/* Summary */}
                            <View style={[styles.statSection, { backgroundColor: theme.card }]}>
                                <Text style={[styles.statSectionTitle, { color: theme.text }]}>Summary</Text>
                                <View style={styles.statRow}>
                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Size:</Text>
                                    <Text style={[styles.statValue, { color: theme.text }]}>
                                        {formatFileSize(storageStats.summary.totalSize)}
                                    </Text>
                                </View>
                                <View style={styles.statRow}>
                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Files:</Text>
                                    <Text style={[styles.statValue, { color: theme.text }]}>
                                        {storageStats.summary.totalFiles}
                                    </Text>
                                </View>
                                <View style={styles.statRow}>
                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Platform:</Text>
                                    <Text style={[styles.statValue, { color: theme.text }]}>
                                        {storageStats.platform}
                                    </Text>
                                </View>
                            </View>

                            {/* Data Counts */}
                            {storageStats.dataCounts && (
                                <View style={[styles.statSection, { backgroundColor: theme.card }]}>
                                    <Text style={[styles.statSectionTitle, { color: theme.text }]}>Database Records</Text>
                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Assets:</Text>
                                        <Text style={[styles.statValue, { color: theme.text }]}>
                                            {storageStats.dataCounts.assets}
                                        </Text>
                                    </View>
                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Transactions:</Text>
                                        <Text style={[styles.statValue, { color: theme.text }]}>
                                            {storageStats.dataCounts.transactions}
                                        </Text>
                                    </View>
                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Budgets:</Text>
                                        <Text style={[styles.statValue, { color: theme.text }]}>
                                            {storageStats.dataCounts.budgets}
                                        </Text>
                                    </View>
                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Archived:</Text>
                                        <Text style={[styles.statValue, { color: theme.text }]}>
                                            {storageStats.dataCounts.archived}
                                        </Text>
                                    </View>
                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>History:</Text>
                                        <Text style={[styles.statValue, { color: theme.text }]}>
                                            {storageStats.dataCounts.history}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Database Files */}
                            <View style={[styles.statSection, { backgroundColor: theme.card }]}>
                                <Text style={[styles.statSectionTitle, { color: theme.text }]}>Database Files</Text>
                                {Object.entries(storageStats.databases).map(([key, dbInfo]) => (
                                    <View key={key} style={styles.dbFileItem}>
                                        <Text style={[styles.dbFileName, { color: theme.text }]}>
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </Text>
                                        <Text style={[styles.dbFilePath, { color: theme.textSecondary }]}>
                                            {dbInfo.path}
                                        </Text>
                                        <View style={styles.statRow}>
                                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                                {dbInfo.exists ? 'Size:' : 'Status:'}
                                            </Text>
                                            <Text style={[styles.statValue, { color: dbInfo.exists ? theme.text : '#FF6B6B' }]}>
                                                {dbInfo.exists ? formatFileSize(dbInfo.size) : 'Not Found'}
                                            </Text>
                                        </View>
                                        {dbInfo.modificationTime && (
                                            <Text style={[styles.dbFileTime, { color: theme.textSecondary }]}>
                                                Modified: {new Date(dbInfo.modificationTime).toLocaleString()}
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </View>

                            {/* Directories */}
                            {Object.entries(storageStats.directories).map(([dirName, dirInfo]) => (
                                <View key={dirName} style={[styles.statSection, { backgroundColor: theme.card }]}>
                                    <Text style={[styles.statSectionTitle, { color: theme.text }]}>
                                        {dirName} Directory
                                    </Text>
                                    <Text style={[styles.dirPath, { color: theme.textSecondary }]}>
                                        {dirInfo.path}
                                    </Text>
                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Size:</Text>
                                        <Text style={[styles.statValue, { color: theme.text }]}>
                                            {formatFileSize(dirInfo.size)}
                                        </Text>
                                    </View>
                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Files:</Text>
                                        <Text style={[styles.statValue, { color: theme.text }]}>
                                            {dirInfo.fileCount}
                                        </Text>
                                    </View>

                                    {/* Top files in directory */}
                                    {dirInfo.files && dirInfo.files.length > 0 && (
                                        <View style={styles.filesList}>
                                            <Text style={[styles.filesListTitle, { color: theme.text }]}>
                                                Files ({Math.min(5, dirInfo.files.length)} of {dirInfo.files.length}):
                                            </Text>
                                            {dirInfo.files
                                                .sort((a, b) => b.size - a.size)
                                                .slice(0, 5)
                                                .map((file, index) => (
                                                    <View key={index} style={styles.fileItem}>
                                                        <View style={styles.fileHeader}>
                                                            <Text style={[styles.fileName, { color: theme.text }]}>
                                                                {file.name}
                                                            </Text>
                                                            <Text style={[styles.fileSize, { color: theme.primary }]}>
                                                                {formatFileSize(file.size)}
                                                            </Text>
                                                        </View>
                                                        <Text style={[styles.fileType, { color: theme.textSecondary }]}>
                                                            {file.type} {file.fileCount ? `(${file.fileCount} files)` : ''}
                                                        </Text>
                                                    </View>
                                                ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </>
                    )}
                </ScrollView>

                <TouchableOpacity
                    style={[styles.refreshButton, { backgroundColor: theme.primary }]}
                    onPress={getStorageStatistics}
                    disabled={loadingStats}
                >
                    {loadingStats ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="refresh" size={20} color="white" />
                            <Text style={styles.refreshButtonText}>Refresh</Text>
                        </>
                    )}
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView style={styles.scrollView}
            // contentContainerStyle={{ paddingBottom: 100 }}
            >
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

                {/* Transaction History Section */}
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

                {/* Archive Management Section */}
                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 30 }]}>Archive Management</Text>

                {/* Auto Archive Toggle */}
                <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="archive-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Auto Archive</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#767577", true: theme.primary }}
                        thumbColor="#f4f3f4"
                        ios_backgroundColor="#3e3e3e"
                        onValueChange={toggleAutoArchive}
                        value={archiveSettings.autoArchive}
                    />
                </View>

                {/* Archive Period Setting */}
                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={() => setShowArchivePeriodModal(true)}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="time-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Archive After</Text>
                    </View>
                    <View style={styles.settingRight}>
                        <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                            {archiveSettings.archiveAfterMonths} months
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Archive Manager */}
                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={() => setShowArchiveManager(true)}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="folder-open-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Manage Archives</Text>
                    </View>
                    <View style={styles.settingRight}>
                        <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                            {archivedCount} archived
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Manual Archive Trigger */}
                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={triggerManualArchive}
                    disabled={isArchiving}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="download-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Archive Old Transactions</Text>
                    </View>
                    {isArchiving ? (
                        <ActivityIndicator color={theme.primary} />
                    ) : (
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    )}
                </TouchableOpacity>

                {/* Data Management Section */}
                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 30 }]}>Data Management</Text>

                {/* Export Data - Modified to show options */}
                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                        Alert.alert(
                            "Export Data",
                            "Choose export option:",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Save to Storage",
                                    onPress: saveDataLocally,
                                    style: "default"
                                },
                                {
                                    text: "Share File",
                                    onPress: () => exportData(true),
                                    style: "default"
                                }
                            ]
                        );
                    }}
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

                {/* Show File Locations - Enhanced */}
                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={showFileSystemInfo}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="folder-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Show Storage Locations</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* Storage Statistics Section - Now Functional */}
                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 30 }]}>Storage Statistics</Text>

                <TouchableOpacity
                    style={[styles.settingItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                        setShowStorageModal(true);
                        if (!storageStats) {
                            getStorageStatistics();
                        }
                    }}
                    disabled={loadingStats}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="stats-chart-outline" size={24} color={theme.primary} style={styles.settingIcon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Database & File Sizes</Text>
                    </View>
                    <View style={styles.settingRight}>
                        {loadingStats ? (
                            <ActivityIndicator color={theme.primary} size="small" />
                        ) : storageStats ? (
                            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                                {formatFileSize(storageStats.summary.totalSize)}
                            </Text>
                        ) : (
                            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                                Tap to view
                            </Text>
                        )}
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Quick Stats Display */}
                {storageStats && (
                    <View style={[styles.quickStatsContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.quickStat}>
                            <Text style={[styles.quickStatValue, { color: theme.primary }]}>
                                {storageStats.dataCounts?.transactions || 0}
                            </Text>
                            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>
                                Transactions
                            </Text>
                        </View>
                        <View style={styles.quickStat}>
                            <Text style={[styles.quickStatValue, { color: theme.primary }]}>
                                {storageStats.summary.totalFiles}
                            </Text>
                            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>
                                Total Files
                            </Text>
                        </View>
                        <View style={styles.quickStat}>
                            <Text style={[styles.quickStatValue, { color: theme.primary }]}>
                                {formatFileSize(storageStats.summary.totalSize)}
                            </Text>
                            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>
                                Storage Used
                            </Text>
                        </View>
                    </View>
                )}

                {/* About Section */}
                <View style={styles.aboutSection}>
                    <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
                        Developer: Nylla
                    </Text>
                    <Text style={[styles.versionText, { color: theme.textSecondary }]}>
                        Version: 1.0.0
                    </Text>
                </View>
            </ScrollView>

            {/* Archive Period Selection Modal */}
            <Modal
                visible={showArchivePeriodModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowArchivePeriodModal(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Archive After</Text>
                            <TouchableOpacity onPress={() => setShowArchivePeriodModal(false)}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={ARCHIVE_PERIODS}
                            keyExtractor={(item) => item.value.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.currencyItem,
                                        {
                                            borderBottomColor: theme.border,
                                            backgroundColor: archiveSettings.archiveAfterMonths === item.value ?
                                                theme.primary + '20' : 'transparent'
                                        }
                                    ]}
                                    onPress={() => updateArchivePeriod(item.value)}
                                >
                                    <Text style={[styles.currencyCode, { color: theme.text }]}
                                    >
                                        {item.label}
                                    </Text>
                                    {archiveSettings.archiveAfterMonths === item.value && (
                                        <Ionicons name="checkmark" size={24} color={theme.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

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
                                    <Text style={[styles.currencySymbol, { color: theme.text }]}
                                    >
                                        {item.symbol}
                                    </Text>
                                    <View style={styles.currencyInfo}>
                                        <Text style={[styles.currencyCode, { color: theme.text }]}>
                                            {item.code}
                                        </Text>
                                        <Text style={[styles.currencyName, { color: theme.textSecondary }]}
                                        >
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
                                        <Text style={[styles.historyDate, { color: theme.textSecondary }]}
                                        >
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

            {/* Archive Manager */}
            <ArchiveManager
                visible={showArchiveManager}
                onClose={() => {
                    setShowArchiveManager(false);
                    loadArchivedCount(); // Refresh count when closing
                }}
            />

            {renderStorageStatsModal()}
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
    quickStatsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 16,
        marginTop: 8,
        marginHorizontal: 16,
        borderRadius: 12,
    },
    quickStat: {
        alignItems: 'center',
    },
    quickStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    quickStatLabel: {
        fontSize: 12,
        textAlign: 'center',
    },
    statsScrollView: {
        flex: 1,
        padding: 16,
    },
    statSection: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    statSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 14,
        flex: 1,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'right',
    },
    dbFileItem: {
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    dbFileName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    dbFilePath: {
        fontSize: 12,
        marginBottom: 8,
        fontFamily: 'monospace',
    },
    dbFileTime: {
        fontSize: 12,
        marginTop: 4,
    },
    dirPath: {
        fontSize: 12,
        marginBottom: 12,
        fontFamily: 'monospace',
    },
    filesList: {
        marginTop: 12,
    },
    filesListTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    fileItem: {
        marginBottom: 8,
        paddingLeft: 8,
    },
    fileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fileName: {
        fontSize: 13,
        flex: 1,
        marginRight: 8,
    },
    fileSize: {
        fontSize: 12,
        fontWeight: '500',
    },
    fileType: {
        fontSize: 11,
        marginTop: 2,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        margin: 16,
        borderRadius: 12,
    },
    refreshButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
    },
});
