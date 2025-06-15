import React, { useContext, useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Image,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatabaseContext } from '../context/DatabaseContext';
import { PreferencesContext } from '../context/PreferencesContext';
import { PieChart } from 'react-native-chart-kit';
import * as ImagePicker from 'expo-image-picker';

// Import the new AssetForm component
import AssetForm from '../components/AssetForm';
import { sortAssetsByAmount } from '../utils/sortUtils';

export default function HomeScreen() {
    const { assets, addAsset, updateAsset, deleteAsset, getTotalAssets, isLoading, loadAssets } = useContext(DatabaseContext);
    const { theme, currency } = useContext(PreferencesContext);

    const [modalVisible, setModalVisible] = useState(false);
    const [distributionModalVisible, setDistributionModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAsset, setCurrentAsset] = useState(null);

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [image, setImage] = useState(null);

    useEffect(() => {
        loadAssets(); // Ensure assets are loaded
    }, []);

    // Format currency
    const formatCurrency = (amount) => {
        return `${currency} ${parseFloat(amount).toFixed(2)}`;
    };

    // Open add/edit asset modal
    const openAssetModal = (asset = null) => {
        if (asset) {
            setIsEditing(true);
            setCurrentAsset(asset);
            setName(asset.name);
            setAmount(asset.amount.toString());
            setImage(asset.image);
        } else {
            setIsEditing(false);
            setCurrentAsset(null);
            setName('');
            setAmount('');
            setImage(null);
        }
        setModalVisible(true);
    };

    // Modified save asset handler to work with the component
    const handleSaveAsset = (assetData) => {
        if (assetData.delete) {
            // Handle asset deletion
            deleteAsset(assetData.id);
            return;
        }

        if (assetData.id) {
            // Update existing asset
            updateAsset(assetData);
        } else {
            // Add new asset
            addAsset(assetData);
        }
    };

    // Delete asset confirmation
    const confirmDelete = () => {
        if (currentAsset) {
            Alert.alert(
                'Confirm Delete',
                `Are you sure you want to delete ${currentAsset.name}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        onPress: () => {
                            deleteAsset(currentAsset.id);
                            setModalVisible(false);
                            resetForm();
                        },
                        style: 'destructive'
                    }
                ]
            );
        }
    };

    // Pick image
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // Updated from ImagePicker.MediaTypeOptions.Images
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    // Modify the getChartData function to match expected format
    const getChartData = () => {
        if (assets.length === 0) return [];

        // Get total for percentage calculation
        const total = getTotalAssets();
        if (total <= 0) return [];  // Prevent division by zero

        console.log('Total assets value:', total);

        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#8AC54B', '#FF6B6B', '#747DFF', '#67D5B5'
        ];

        // Format data according to react-native-chart-kit requirements
        const chartData = assets.map((asset, index) => {
            const value = parseFloat(asset.amount);
            // Only include positive values
            if (isNaN(value) || value <= 0) return null;

            const percentage = (value / total * 100).toFixed(1);

            return {
                name: `${asset.name} (${percentage}%)`,
                population: value, // This should match the accessor used in PieChart
                color: colors[index % colors.length],
                legendFontColor: theme.text,
                legendFontSize: 12
            };
        }).filter(item => item !== null);

        console.log('Chart data:', JSON.stringify(chartData));
        return chartData;
    };

    // Sort assets by amount (highest to lowest)
    const sortedAssets = sortAssetsByAmount(assets);

    // Render asset item
    const renderAssetItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.assetItem, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => openAssetModal(item)}
        >
            <View style={styles.assetIconContainer}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.assetIcon} />
                ) : (
                    <Ionicons name="wallet-outline" size={32} color={theme.primary} />
                )}
            </View>
            <View style={styles.assetDetails}>
                <Text style={[styles.assetName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.assetAmount, { color: theme.primary }]}>
                    {formatCurrency(item.amount)}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.border} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Total Assets Card */}
            <View style={[styles.totalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.totalHeader}>
                    <Text style={[styles.totalLabel, { color: theme.text }]}>Total Assets</Text>
                    {/* Add the distribution button back here */}
                    <TouchableOpacity
                        style={[styles.distributionButton, { backgroundColor: theme.primary }]}
                        onPress={() => setDistributionModalVisible(true)}
                    >
                        <Text style={styles.distributionButtonText}>View Distribution</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.totalAmount, { color: theme.primary }]}>
                    {formatCurrency(getTotalAssets())}
                </Text>
            </View>

            {/* Assets List */}
            <View style={styles.listHeader}>
                <Text style={[styles.listTitle, { color: theme.text }]}>Your Assets</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={() => openAssetModal()}
                >
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: theme.text }]}>Loading assets...</Text>
                </View>
            ) : sortedAssets.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="wallet-outline" size={64} color={theme.border} />
                    <Text style={[styles.emptyText, { color: theme.text }]}>No assets yet</Text>
                    <Text style={[styles.emptySubText, { color: theme.border }]}>
                        Tap the + button to add your first asset
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={sortedAssets}
                    renderItem={renderAssetItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}

            {/* Replace the existing Modal with the AssetForm component */}
            <AssetForm
                visible={modalVisible}
                asset={currentAsset}
                onClose={() => {
                    setModalVisible(false);
                    setCurrentAsset(null);
                    setIsEditing(false);
                }}
                onSave={handleSaveAsset}
            />

            {/* Distribution Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={distributionModalVisible}
                onRequestClose={() => setDistributionModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Asset Distribution</Text>
                            <TouchableOpacity onPress={() => setDistributionModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.chartContainer}
                            contentContainerStyle={styles.chartContentContainer}
                            showsVerticalScrollIndicator={true}
                        >
                            {sortedAssets.length === 0 ? (
                                <View style={styles.emptyChart}>
                                    <Text style={[styles.emptyText, { color: theme.text }]}>
                                        No assets to display
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {/* Debug information */}
                                    <View style={styles.debugInfo}>
                                        <Text style={{ color: theme.text }}>
                                            Total Assets: {assets.length} | Total Value: {getTotalAssets().toFixed(2)}
                                        </Text>
                                    </View>

                                    {/* Chart display */}
                                    {getChartData().length > 0 ? (
                                        <View style={styles.chartWrapper}>
                                            <PieChart
                                                data={getChartData()}
                                                width={300}
                                                height={220}
                                                chartConfig={{
                                                    backgroundColor: "#ffffff",
                                                    backgroundGradientFrom: "#ffffff",
                                                    backgroundGradientTo: "#ffffff",
                                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                                }}
                                                accessor="population"
                                                backgroundColor="transparent"
                                                paddingLeft="0"
                                                center={[70, 0]}
                                                absolute
                                                hasLegend={false}
                                            />
                                        </View>
                                    ) : (
                                        <View style={styles.emptyChart}>
                                            <Text style={[styles.emptyText, { color: theme.text }]}>
                                                Cannot display chart with current data
                                            </Text>
                                        </View>
                                    )}

                                    {/* Asset breakdown list - use sortedAssets here too */}
                                    <View style={[styles.distributionList, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
                                        <Text style={[styles.distributionTitle, { color: theme.text }]}>
                                            Asset Breakdown
                                        </Text>
                                        {sortedAssets.map((asset, index) => {
                                            const chartData = getChartData();
                                            const color = index < chartData.length ? chartData[index]?.color : '#CCCCCC';
                                            const percentage = getTotalAssets() > 0
                                                ? (asset.amount / getTotalAssets() * 100).toFixed(1)
                                                : '0.0';

                                            return (
                                                <View key={asset.id} style={[styles.distributionItem, { borderBottomColor: theme.border }]}>
                                                    <View style={[styles.distributionColor, { backgroundColor: color }]} />
                                                    <Text style={[styles.distributionName, { color: theme.text }]}>{asset.name}</Text>
                                                    <Text style={[styles.distributionAmount, { color: theme.primary }]}>
                                                        {formatCurrency(asset.amount)}
                                                    </Text>
                                                    <Text style={[styles.distributionPercentage, { color: theme.border }]}>
                                                        {percentage}%
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
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
    totalCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    totalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    totalAmount: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    distributionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    distributionButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingBottom: 24,
    },
    assetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    assetIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    assetIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    assetDetails: {
        flex: 1,
    },
    assetName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    assetAmount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker for better contrast
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 10,
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
    chartContainer: {
        display: 'flex',
        width: '100%',
    },
    chartContentContainer: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        width: '100%',
        height: 220,

    },
    debugInfo: {
        width: '100%',
        padding: 10,
        marginBottom: 5,
        borderRadius: 5,
    },
    emptyChart: {
        height: 200,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
    },
    distributionList: {
        width: '100%',
        marginTop: 10,
        paddingTop: 10,
        paddingBottom: 20,
    },
    distributionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    distributionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    distributionColor: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 12,
    },
    distributionName: {
        flex: 1,
        fontSize: 16,
    },
    distributionAmount: {
        fontSize: 16,
        fontWeight: '500',
        marginRight: 12,
    },
    distributionPercentage: {
        width: 60,
        textAlign: 'right',
        fontSize: 14,
    },
});
