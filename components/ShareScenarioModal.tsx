import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Mail, Users, Globe, Copy, Check } from 'lucide-react-native';
import { useScenarios, CloudScenario } from '@/hooks/useScenarios';

interface ShareScenarioModalProps {
  visible: boolean;
  onClose: () => void;
  scenario: CloudScenario | null;
}

export default function ShareScenarioModal({ visible, onClose, scenario }: ShareScenarioModalProps) {
  const [emails, setEmails] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { shareScenario } = useScenarios();

  const handleShare = async () => {
    if (!scenario) return;

    const emailList = emails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (!isPublic && emailList.length === 0) {
      Alert.alert('Error', 'Please enter at least one email address or make the scenario public');
      return;
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      Alert.alert('Error', `Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      await shareScenario(scenario.id, emailList, isPublic);
      Alert.alert(
        'Success',
        isPublic 
          ? 'Scenario is now publicly accessible'
          : `Scenario shared with ${emailList.length} ${emailList.length === 1 ? 'person' : 'people'}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to share scenario');
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (!scenario) return;

    const shareUrl = `${window.location.origin}/shared/${scenario.id}`;
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!scenario) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#0A0E1A', '#1E293B']}
            style={styles.gradient}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Share Scenario</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Scenario Preview */}
              <View style={styles.scenarioPreview}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <View style={styles.scenarioDetails}>
                  <Text style={styles.scenarioDetail}>
                    {scenario.starting_amount > 0 && `${formatCurrency(scenario.starting_amount)} start + `}
                    ${scenario.monthly_amount}/mo • {scenario.years}Y • {scenario.asset} ({scenario.cagr}%)
                  </Text>
                  <Text style={styles.scenarioValue}>
                    Future Value: {formatCurrency(scenario.future_value)}
                  </Text>
                </View>
              </View>

              {/* Share Options */}
              <View style={styles.shareOptions}>
                {/* Email Sharing */}
                <View style={styles.shareOption}>
                  <View style={styles.optionHeader}>
                    <Mail size={20} color="#00D4AA" />
                    <Text style={styles.optionTitle}>Share with specific people</Text>
                  </View>
                  <Text style={styles.optionDescription}>
                    Enter email addresses separated by commas
                  </Text>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="advisor@example.com, partner@example.com"
                    placeholderTextColor="#64748B"
                    value={emails}
                    onChangeText={setEmails}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                  />
                </View>

                {/* Public Sharing */}
                <View style={styles.shareOption}>
                  <TouchableOpacity
                    style={styles.publicToggle}
                    onPress={() => setIsPublic(!isPublic)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionHeader}>
                      <Globe size={20} color="#F59E0B" />
                      <Text style={styles.optionTitle}>Make publicly accessible</Text>
                    </View>
                    <View style={[styles.toggle, isPublic && styles.toggleActive]}>
                      <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.optionDescription}>
                    Anyone with the link can view this scenario
                  </Text>
                </View>

                {/* Copy Link */}
                {(isPublic || scenario.is_public) && (
                  <View style={styles.shareOption}>
                    <View style={styles.optionHeader}>
                      <Copy size={20} color="#8B5CF6" />
                      <Text style={styles.optionTitle}>Share link</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={copyShareLink}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.copyButtonText}>
                        {window.location.origin}/shared/{scenario.id}
                      </Text>
                      {copied ? (
                        <Check size={16} color="#00D4AA" />
                      ) : (
                        <Copy size={16} color="#8B5CF6" />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Share Button */}
              <TouchableOpacity
                style={[styles.shareButton, loading && styles.shareButtonDisabled]}
                onPress={handleShare}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#00D4AA', '#00A887']}
                  style={styles.shareGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Users size={20} color="#FFFFFF" />
                      <Text style={styles.shareButtonText}>Share Scenario</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Info */}
              <View style={styles.info}>
                <Text style={styles.infoText}>
                  💡 Shared scenarios are read-only. Recipients can view and copy the scenario but cannot modify your original.
                </Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  scenarioPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scenarioName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scenarioDetails: {
    gap: 4,
  },
  scenarioDetail: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  scenarioValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
  },
  shareOptions: {
    gap: 20,
    marginBottom: 24,
  },
  shareOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 12,
  },
  emailInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  publicToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#F59E0B',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    padding: 12,
  },
  copyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    flex: 1,
    marginRight: 8,
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  info: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#00D4AA',
    lineHeight: 20,
  },
});