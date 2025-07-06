import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Heart, Share2, Info, User, LogOut, LogIn, UserPlus, Cloud } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import GlassCard from '@/components/GlassCard';
import AuthModal from '@/components/AuthModal';
import CloudSyncIndicator from '@/components/CloudSyncIndicator';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsScreen() {
  const { user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [signingOut, setSigningOut] = useState(false);

  const handleShare = async () => {
    const message = 'Check out Freedom21 - the ultimate wealth calculator with Bitcoin benchmark comparisons! 📈💰';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Freedom21 - Wealth Calculator',
          text: message,
          url: window.location.href,
        });
      } catch (error) {
        navigator.clipboard.writeText(`${message} ${window.location.href}`);
        alert('App link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(`${message} ${window.location.href}`);
      alert('App link copied to clipboard!');
    }
  };

  const handleSignOut = async () => {
    if (signingOut || loading) {
      console.log('Sign out already in progress or auth loading');
      return;
    }
    
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your scenarios will remain saved in the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed sign out');
            setSigningOut(true);
            try {
              console.log('Calling signOut...');
              const { error } = await signOut();
              console.log('signOut result:', { error });
              
              if (error) {
                console.error('Sign out error:', error);
                // Don't show error alert since we force sign out anyway
                console.log('Sign out completed despite error');
              } else {
                console.log('Successfully signed out');
              }
            } catch (error) {
              console.error('Unexpected sign out error:', error);
              // Don't show error alert since we force sign out anyway
              console.log('Sign out completed despite unexpected error');
            } finally {
              console.log('Clearing signingOut state');
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress,
    color = '#00D4AA',
    showChevron = true,
    disabled = false
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    color?: string;
    showChevron?: boolean;
    disabled?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.settingItem, disabled && styles.settingItemDisabled]} 
      onPress={onPress}
      disabled={!onPress || disabled}
      activeOpacity={0.8}
    >
      <GlassCard style={styles.settingCard}>
        <View style={[styles.settingIcon, { backgroundColor: `${color}20` }]}>
          {icon}
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, disabled && styles.settingSubtitleDisabled]}>{subtitle}</Text>}
        </View>
        {disabled && (
          <ActivityIndicator size="small" color={color} style={styles.settingLoader} />
        )}
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0E1A', '#1E293B', '#0F172A']}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <AnimatedCard delay={0}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                {user ? (
                  <User size={32} color="#00D4AA" strokeWidth={2} />
                ) : (
                  <Settings size={32} color="#00D4AA" strokeWidth={2} />
                )}
              </View>
              <Text style={styles.title}>{user ? 'Account' : 'Settings'}</Text>
              <Text style={styles.subtitle}>
                {user ? 'Manage your account and preferences' : 'Customize your experience'}
              </Text>
            </View>
          </AnimatedCard>

          {/* User Account Section */}
          {user ? (
            <AnimatedCard delay={100}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.settingsGroup}>
                  {/* User Profile */}
                  <GlassCard style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                      <View style={styles.profileAvatar}>
                        <User size={24} color="#00D4AA" />
                      </View>
                      <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>
                          {user.user_metadata?.full_name || 'User'}
                        </Text>
                        <Text style={styles.profileEmail}>{user.email}</Text>
                      </View>
                    </View>
                    <CloudSyncIndicator 
                      onPress={() => Alert.alert('Cloud Sync', 'Your scenarios are automatically synced to the cloud when you sign in.')}
                    />
                  </GlassCard>

                  <SettingItem
                    icon={<LogOut size={24} color="#EF4444" />}
                    title={signingOut ? "Signing Out..." : "Sign Out"}
                    subtitle="Sign out of your account"
                    onPress={handleSignOut}
                    color="#EF4444"
                    disabled={signingOut || loading}
                  />
                </View>
              </View>
            </AnimatedCard>
          ) : (
            <AnimatedCard delay={100}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.settingsGroup}>
                  <SettingItem
                    icon={<LogIn size={24} color="#00D4AA" />}
                    title="Sign In"
                    subtitle="Access your saved scenarios across devices"
                    onPress={() => openAuthModal('signin')}
                    disabled={loading}
                  />

                  <SettingItem
                    icon={<UserPlus size={24} color="#8B5CF6" />}
                    title="Create Account"
                    subtitle="Save scenarios and sync across devices"
                    onPress={() => openAuthModal('signup')}
                    color="#8B5CF6"
                    disabled={loading}
                  />
                </View>
              </View>
            </AnimatedCard>
          )}

          {/* App Info */}
          <AnimatedCard delay={200}>
            <GlassCard style={styles.appInfoCard}>
              <View style={styles.appInfoHeader}>
                <View style={styles.appLogo}>
                  <Text style={styles.appLogoText}>F21</Text>
                </View>
                <View>
                  <Text style={styles.appInfoTitle}>Freedom21</Text>
                  <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
                </View>
              </View>
              <Text style={styles.appInfoDescription}>
                A modern wealth calculator with Bitcoin benchmark comparisons. 
                Build your financial future with smart investing strategies.
              </Text>
            </GlassCard>
          </AnimatedCard>

          {/* Share App - Made more prominent */}
          <AnimatedCard delay={300}>
            <View style={styles.section}>
              <View style={styles.settingsGroup}>
                <TouchableOpacity
                  style={styles.shareAppButton}
                  onPress={handleShare}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#00D4AA', '#00A887']}
                    style={styles.shareAppGradient}
                  >
                    <Share2 size={24} color="#FFFFFF" />
                    <View style={styles.shareAppContent}>
                      <Text style={styles.shareAppTitle}>Share Freedom21</Text>
                      <Text style={styles.shareAppSubtitle}>Tell your friends about this wealth calculator</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedCard>

          {/* About */}
          <AnimatedCard delay={400}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.settingsGroup}>
                <SettingItem
                  icon={<Info size={24} color="#00D4AA" />}
                  title="How It Works"
                  subtitle="Learn about our calculation methods"
                  onPress={() => alert('Freedom21 uses standard DCA formulas with annual compounding to provide conservative wealth projections.')}
                />

                <SettingItem
                  icon={<Heart size={24} color="#EF4444" />}
                  title="Made For My Children"
                  subtitle="Built for the Bitcoin community"
                  color="#EF4444"
                  showChevron={false}
                />
              </View>
            </View>
          </AnimatedCard>

          {/* Cloud Features */}
          {user && (
            <AnimatedCard delay={500}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cloud Features</Text>
                <GlassCard style={styles.cloudFeaturesCard}>
                  <View style={styles.cloudFeaturesList}>
                    <View style={styles.cloudFeature}>
                      <Cloud size={20} color="#00D4AA" />
                      <Text style={styles.cloudFeatureText}>Automatic scenario backup</Text>
                    </View>
                    <View style={styles.cloudFeature}>
                      <User size={20} color="#00D4AA" />
                      <Text style={styles.cloudFeatureText}>Cross-device synchronization</Text>
                    </View>
                    <View style={styles.cloudFeature}>
                      <Share2 size={20} color="#00D4AA" />
                      <Text style={styles.cloudFeatureText}>Share scenarios with advisors</Text>
                    </View>
                  </View>
                </GlassCard>
              </View>
            </AnimatedCard>
          )}

          {/* Disclaimer */}
          <AnimatedCard delay={600}>
            <GlassCard style={styles.disclaimerContainer}>
              <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
              <Text style={styles.disclaimerText}>
                Investment calculations are based on historical data and mathematical models. 
                Past performance does not guarantee future results. The Bitcoin benchmark is 
                used for comparison purposes only. Always consult with a qualified financial 
                advisor before making investment decisions.
              </Text>
            </GlassCard>
          </AnimatedCard>

          {/* Legal */}
          <AnimatedCard delay={700}>
            <View style={styles.legalContainer}>
              <TouchableOpacity style={styles.legalButton} activeOpacity={0.7}>
                <Text style={styles.legalText}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>•</Text>
              <TouchableOpacity style={styles.legalButton} activeOpacity={0.7}>
                <Text style={styles.legalText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        </ScrollView>

        {/* Auth Modal */}
        <AuthModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  settingsGroup: {
    gap: 12,
  },
  settingItem: {
    marginBottom: 0,
  },
  settingItemDisabled: {
    opacity: 0.6,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingTitleDisabled: {
    color: '#94A3B8',
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  settingSubtitleDisabled: {
    color: '#64748B',
  },
  settingLoader: {
    marginLeft: 12,
  },
  profileCard: {
    paddingVertical: 20,
    marginBottom: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  appInfoCard: {
    marginBottom: 32,
    paddingVertical: 24,
  },
  appInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appLogo: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  appLogoText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  appInfoTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  appInfoVersion: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  appInfoDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 22,
  },
  shareAppButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  shareAppGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 16,
  },
  shareAppContent: {
    flex: 1,
  },
  shareAppTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  shareAppSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  cloudFeaturesCard: {
    paddingVertical: 20,
  },
  cloudFeaturesList: {
    gap: 16,
  },
  cloudFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cloudFeatureText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  disclaimerContainer: {
    marginBottom: 24,
    paddingVertical: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  disclaimerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
    marginBottom: 12,
  },
  disclaimerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 20,
  },
  legalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  legalButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  legalText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  legalSeparator: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginHorizontal: 8,
  },
});