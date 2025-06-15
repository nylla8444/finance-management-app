import React, { useContext } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from './screens/HomeScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import BudgetScreen from './screens/BudgetScreen';
import SettingsScreen from './screens/SettingsScreen';

// Import database context
import { DatabaseProvider } from './context/DatabaseContext';
import { PreferencesProvider, PreferencesContext } from './context/PreferencesContext';

const Tab = createBottomTabNavigator();

// Navigation theme wrapper component
function AppNavigator() {
  const { darkMode, theme } = useContext(PreferencesContext);

  // Customize navigation themes
  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
    },
  };

  return (
    <>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <NavigationContainer theme={darkMode ? customDarkTheme : customLightTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Transactions') {
                iconName = focused ? 'swap-vertical' : 'swap-vertical-outline';
              } else if (route.name === 'Budget') {
                iconName = focused ? 'wallet' : 'wallet-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: theme.primary,
            tabBarInactiveTintColor: darkMode ? '#888888' : 'gray',
            tabBarStyle: {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
            },
            headerStyle: {
              backgroundColor: theme.card,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomColor: theme.border,
              borderBottomWidth: 0.5,
            },
            headerTintColor: theme.text,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Transactions" component={TransactionsScreen} />
          <Tab.Screen name="Budget" component={BudgetScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <DatabaseProvider>
          <AppNavigator />
        </DatabaseProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
