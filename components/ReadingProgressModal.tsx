import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Goal } from '../types';

interface ReadingProgressModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (pages: number) => Promise<void>;
  goalTitle: string;
  currentPage: number;
  targetPage?: number;
}

const ReadingProgressModal: React.FC<ReadingProgressModalProps> = ({
  isVisible,
  onClose,
  onSave,
  goalTitle,
  currentPage,
  targetPage
}) => {
  const [pagesInput, setPagesInput] = useState('');

  useEffect(() => {
    if (!isVisible) {
      setPagesInput('');
    }
  }, [isVisible]);

  const handleSave = async () => {
    const pagesRead = parseInt(pagesInput, 10);
    if (isNaN(pagesRead) || pagesRead <= 0) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาป้อนจำนวนหน้าที่ถูกต้องและมากกว่า 0');
      return;
    }
    await onSave(pagesRead);
    setPagesInput('');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.centeredView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>บันทึกความคืบหน้า</Text>
          <Text style={styles.modalText}>
            คุณอ่านไปแล้วกี่หน้าสำหรับ "{goalTitle}"?
          </Text>
          <Text style={styles.modalCurrentPage}>
            (หน้าปัจจุบัน: {currentPage} {targetPage !== undefined ? `/ ${targetPage}` : ''})
          </Text>

          <TextInput
            style={styles.input}
            onChangeText={setPagesInput}
            value={pagesInput}
            keyboardType="number-pad"
            placeholder="จำนวนหน้าที่อ่าน"
            placeholderTextColor="#999"
            autoFocus
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onClose}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSave]}
              onPress={handleSave}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#34495E',
  },
  modalText: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
  },
  modalCurrentPage: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    color: '#777',
  },
  input: {
    height: 50,
    borderColor: '#CCC',
    borderWidth: 1,
    borderRadius: 8,
    width: '100%',
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonCancel: {
    backgroundColor: '#E74C3C',
  },
  buttonSave: {
    backgroundColor: '#2ECC71',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 5,
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 5,
  }
});

export default ReadingProgressModal;