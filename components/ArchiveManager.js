import React, { useState, useContext, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Modal,
    Alert,
    TextInput,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseContext } from '../context/DatabaseContext';
import { PreferencesContext } from '../context/PreferencesContext';
import TransactionItem from './TransactionItem';

export default function ArchiveManager({ visible, onClose }) {
    const {
        archivedTransactions,
        loadArchivedTransactions,
        getArchivedTransactionsCount,
        restoreArchivedTransaction,
        deleteArchivedTransaction,
        getArchiveStatistics,
        searchAllTransactions,
        archiveTransactionsByDateRange
    } = useContext(DatabaseContext);

    const { theme, currency } = useContext(PreferencesContext);

    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [stats, setStats] = useState(null);
    const [showManualArchive, setShowManualArchive] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (visible) {
            loadInitialData();
        }
    }, [visible]);

    const loadInitialData = async () => {
        setLoading(true);
        setCurrentPage(0);
        await Promise.all([
            loadArchivedTransactions(0),
            loadStats()
        ]);
        setLoading(false);
    };

    const loadStats = async () => {
        const statistics = await getArchiveStatistics();
        setStats(statistics);
    };

    const loadMoreTransactions = async () => {
        if (loading || !hasMoreData) return;

        setLoading(true);
        const nextPage = currentPage + 1;
        const newTransactions = await loadArchivedTransactions(nextPage);

        if (newTransactions.length === 0) {
            setHasMoreData(false);
        } else {
            setCurrentPage(nextPage);
        }
        setLoading(false);
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);

        if (query.trim() === '') {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        const results = await searchAllTransactions(query, true);
        setSearchResults(results);
        setLoading(false);
    };

    const handleTransactionPress = (transaction) => {
        const isArchived = transaction.source === 'archived';

        Alert.alert(
            transaction.category,
            `Amount: ${currency} ${transaction.amount}\nDate: ${new Date(transaction.date).toLocaleDateString()}\nLocation: ${transaction.location}${transaction.description ? `\nDescription: ${transaction.description}` : ''}\n\nStatus: ${isArchived ? 'Archived' : 'Active'}`,
            [
                { text: 'Close', style: 'cancel' },
                ...(isArchived ? [
                    {
                        text: 'Restore',
                        onPress: () => handleRestore(transaction.id)
                    },
                    {
                        text: 'Delete Forever',
                        style: 'destructive',
                        onPress: () => confirmPermanentDelete(transaction.id)
                    }
                ] : [])
            ]
        );
    };

    const handleRestore = async (archivedId) => {
        const success = await restoreArchivedTransaction(archivedId);
        if (success) {
            Alert.alert('Success', 'Transaction restored successfully');
            loadInitialData();
        }
    };

    const confirmPermanentDelete = (archivedId) => {
        Alert.alert(
            'Permanent Delete',
            'This will permanently delete the transaction. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteArchivedTransaction(archivedId);
                        if (success) {
                            Alert.alert('Deleted', 'Transaction permanently deleted');
                            loadInitialData();
                        }
                    }
                }
            ]
        );
    };

    const handleManualArchive = async () => {
        if (!startDate || !endDate) {
            Alert.alert('Error', 'Please select both start and end dates');
            return;
        }

        const count = await archiveTransactionsByDateRange(startDate, endDate);
        Alert.alert('Success', `${count} transactions archived`);
        setShowManualArchive(false);
        loadInitialData();
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={theme.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search all transactions..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {stats && (
                <View style={[styles.statsContainer, { backgroundColor: theme.card }]}>
                    <Text style={[styles.statsTitle, { color: theme.text }]}>Archive Statistics</Text>
                    <View style={styles.statsRow}>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                            Total Archived: {stats.total_archived}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                            Income: {currency} {parseFloat(stats.total_income || 0).toFixed(2)}
                        </Text>
                    </View>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                        Expenses: {currency} {parseFloat(stats.total_expenses || 0).toFixed(2)}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.archiveButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowManualArchive(true)}
            >
                <Text style={styles.archiveButtonText}>Manual Archive</Text>
            </TouchableOpacity>
        </View>
    );

    const displayData = searchQuery ? searchResults : archivedTransactions;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    <Text style={[styles.title, { color: theme.text }]}>Archive Manager</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={displayData}
                    renderItem={({ item }) => (
                        <TransactionItem
                            transaction={item}
                            onPress={handleTransactionPress}
                            theme={theme}
                        />
                    )}
                    keyExtractor={item => `${item.source || 'active'}-${item.id}`}
                    ListHeaderComponent={renderHeader}
                    onEndReached={!searchQuery ? loadMoreTransactions : null}
                    onEndReachedThreshold={0.1}
                    ListFooterComponent={loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={theme.primary} />
                        </View>
                    ) : null}
                    contentContainerStyle={styles.listContent}
                />

                {/* Manual Archive Modal */}
                <Modal
                    visible={showManualArchive}
                    transparent={true}
                    animationType="fade"
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Manual Archive</Text>

                            <Text style={[styles.inputLabel, { color: theme.text }]}>Start Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={[styles.dateInput, { borderColor: theme.border, color: theme.text }]}
                                value={startDate}
                                onChangeText={setStartDate}
                                placeholder="2023-01-01"
                                placeholderTextColor={theme.textSecondary}
                            />

                            <Text style={[styles.inputLabel, { color: theme.text }]}>End Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={[styles.dateInput, { borderColor: theme.border, color: theme.text }]}
                                value={endDate}
                                onChangeText={setEndDate}
                                placeholder="2023-12-31"
                                placeholderTextColor={theme.textSecondary}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: theme.border }]}
                                    onPress={() => setShowManualArchive(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: theme.primary }]}
                                    onPress={handleManualArchive}
                                >
                                    <Text style={styles.modalButtonText}>Archive</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerContainer: {
        padding: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        marginLeft: 8,
        fontSize: 16,
    },
    statsContainer: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
    },
    archiveButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    archiveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 20,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        padding: 20,
        borderRadius: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: 4,
        marginTop: 12,
    },
    dateInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
