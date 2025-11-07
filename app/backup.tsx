import React from 'react';
import { View, Alert, StyleSheet, Text, Platform, TouchableOpacity, Image } from 'react-native';
import { backupGoals, restoreGoals } from '../lib/storage';
import { useDarkMode } from '../context/DarkModeContext';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { LinearGradient } from 'expo-linear-gradient';

const BackIcon = require('../assets/images/arrow-left.png');
const CloudSyncIcon = require('../assets/images/cloud-sync.png');
const CloudUploadIcon = require('../assets/images/cloud-upload.png');
const CloudDownloadIcon = require('../assets/images/cloud-download.png');

const showAlert = (title: string, message: string): void => {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n${message}`);
    } else {
        Alert.alert(title, message);
    }
};

const showConfirmAlert = (title: string, message: string, onPressOk: () => void): void => {
    if (Platform.OS === 'web') {
        if (window.confirm(`${title}\n${message}`)) {
            onPressOk();
        }
    } else {
        Alert.alert(
            title,
            message,
            [
                { text: "ยกเลิก", style: "cancel" },
                { text: "กู้คืน", onPress: onPressOk },
            ],
            { cancelable: false }
        );
    }
};

export default function BackupScreen() {
    const { isDarkMode } = useDarkMode();
    const router = useRouter();

    const handleBackup = async () => {
        try {
            await backupGoals();
            showAlert("สำรองข้อมูลสำเร็จ", "ข้อมูลเป้าหมายของคุณถูกสำรองแล้ว");
        } catch (error) {
            let errorMessage = "มีข้อผิดพลาดในการสำรองข้อมูล";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            showAlert("สำรองข้อมูลไม่สำเร็จ", errorMessage);
            console.error("Backup failed:", error);
        }
    };

    const handleRestore = async () => {
        showConfirmAlert(
            "ยืนยันการกู้คืนข้อมูล",
            "การกระทำนี้จะเขียนทับเป้าหมายที่มีอยู่ในเครื่องปัจจุบันของคุณ คุณแน่ใจหรือไม่?",
            async () => {
                try {
                    await restoreGoals();
                    showAlert("กู้คืนข้อมูลสำเร็จ", "ข้อมูลเป้าหมายของคุณถูกกู้คืนแล้ว");
                    router.replace('/'); 
                } catch (error) {
                    let errorMessage = "มีข้อผิดพลาดในการกู้คืนข้อมูล";
                    let isNoBackupError = false;
                    if (error instanceof Error) {
                        errorMessage = error.message;
                        if (error.message === "No backup found for this user.") {
                            isNoBackupError = true;
                        }
                    }
                    if (isNoBackupError) {
                        showAlert("ไม่พบข้อมูลสำรอง", "ไม่พบข้อมูลสำรองสำหรับผู้ใช้นี้ คุณยังไม่เคยสำรองข้อมูลใช่หรือไม่?");
                    } else {
                        showAlert("กู้คืนข้อมูลไม่สำเร็จ", errorMessage);
                    }
                    console.error("Restore failed:", error);
                }
            }
        );
    };

    return (
        <View style={[styles.container, isDarkMode ? styles.bgDark : styles.bgLight]}>
            <LinearGradient
                colors={['#F6A192', '#F7B394']}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image source={BackIcon} style={styles.iconButtonImage} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: '#fff' }]}>สำรองและกู้คืนข้อมูล</Text>
            </LinearGradient>

            <View style={styles.contentContainer}>
                <Image 
                    source={CloudSyncIcon} 
                    style={[styles.largeIcon, { tintColor: isDarkMode ? '#B9A6F7' : '#937BEF' }]} 
                
                />
                <Text style={[styles.descriptionText, isDarkMode ? styles.descriptionTextDark : styles.descriptionTextLight]}>
                    จัดการข้อมูลเป้าหมายของคุณให้ปลอดภัย สำรองข้อมูลไปยังคลาวด์เพื่อป้องกันการสูญหาย 
                    หรือกู้คืนข้อมูลจากคลาวด์เพื่อนำเป้าหมายกลับมา.
                </Text>

                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={handleBackup}
                >
                    <LinearGradient
                        colors={['#937BEF', '#B9A6F7']} 
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Image source={CloudUploadIcon} style={styles.buttonIconImage} />
                        <Text style={styles.buttonText}>สำรองข้อมูล</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={handleRestore}
                >
                    <LinearGradient
                        colors={['#F6A192', '#F7B394']} 
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Image source={CloudDownloadIcon} style={styles.buttonIconImage} />
                        <Text style={styles.buttonText}>กู้คืนข้อมูล</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgLight: {
        backgroundColor: '#F7F9FC',
    },
    bgDark: {
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        borderBottomWidth: 1,
        borderBottomColor: '#F7B394',
        minHeight: Platform.OS === 'ios' ? 90 : 70,
    },
    backButton: {
        position: 'absolute',
        left: 15,
        top: Platform.OS === 'ios' ? 50 : 30,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#34495E',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    largeIcon: {
        width: 100, 
        height: 100,
        marginBottom: 30,
        resizeMode: 'contain',
    },
    descriptionText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    descriptionTextLight: {
        color: '#555',
    },
    descriptionTextDark: {
        color: '#BDC3C7',
    },
    actionButton: {
        width: '85%',
        borderRadius: 30, 
        marginBottom: 15, 
        overflow: 'hidden', 
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15, 
        paddingHorizontal: 20,
        borderRadius: 30,
    },
    buttonIconImage: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        tintColor: '#FFFFFF', 
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18, 
        fontWeight: 'bold',
        marginLeft: 10, 
    },
    iconButtonImage: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        tintColor: '#fff', 
    },
});