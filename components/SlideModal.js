import React, { useState } from 'react';
import { View, Modal, StyleSheet, Animated } from 'react-native';

const SlideModal = ({ visible, onClose, children }) => {
    const [slideAnim] = useState(new Animated.Value(0));

    React.useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [500, 0], // Adjust the output range for your design
    });

    return (
        <Modal transparent={true} visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[styles.modalContainer, { transform: [{ translateY }] }]}>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        margin: 20,
        elevation: 5,
    },
});

export default SlideModal;