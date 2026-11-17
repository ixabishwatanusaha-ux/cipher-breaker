import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Vibration,
} from 'react-native';

const COLORS = {
  BG_DARK: '#121621',
  CARD_BG: '#1c2230',
  HEADER_BG: '#1e3a8a',
  ACCENT_CYAN: '#38bdf8',
  ACCENT_GREEN: '#34d399',
  ACCENT_AMBER: '#fbbf24',
  TEXT_LIGHT: '#f1f5f9',
  TEXT_MUTED: '#94a3b8',
  BORDER: '#334155',
  DANGER: '#f87171',
};

const MAX_TRIES = 10;

export default function App() {
  const [secretCode, setSecretCode] = useState('');
  const [digitCount, setDigitCount] = useState(4);
  const [digitSum, setDigitSum] = useState(0);
  const [hasZero, setHasZero] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [history, setHistory] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const scrollViewRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    startNewGame();
  }, []);

  // Synthesize cyber/hack sound effects using Web Audio API + Haptics
  const playCyberSound = (type) => {
    if (!soundEnabled) return;

    // Tactile vibration on mobile devices
    if (Platform.OS !== 'web') {
      if (type === 'win') {
        Vibration.vibrate([0, 80, 60, 160]);
      } else if (type === 'wrong') {
        Vibration.vibrate([0, 120, 50, 120]);
      } else if (type === 'gameover') {
        Vibration.vibrate(400);
      } else if (type === 'click') {
        Vibration.vibrate(25);
      }
    }

    // Web Audio API synthesizer (works in Web preview & Android/iOS WebView/PWA)
    try {
      const AudioContext =
        typeof window !== 'undefined' &&
        (window.AudioContext || window.webkitAudioContext);
      if (!AudioContext) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (type === 'click') {
        // Short digital key-tap blip
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(920, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'wrong') {
        // Low gritty terminal access-denied double buzz
        [0, 0.14].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(155, now + offset);
          osc.frequency.linearRampToValueAtTime(95, now + offset + 0.11);
          gain.gain.setValueAtTime(0.14, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.12);
        });
      } else if (type === 'win') {
        // Fast ascending cyber mainframe unlock arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        notes.forEach((freq, idx) => {
          const offset = idx * 0.075;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + offset);
          gain.gain.setValueAtTime(0.11, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.16);
        });
      } else if (type === 'gameover') {
        // Descending system lockout power-down
        const notes = [293.66, 220.0, 146.83];
        notes.forEach((freq, idx) => {
          const offset = idx * 0.16;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + offset);
          gain.gain.setValueAtTime(0.13, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.22);
        });
      }
    } catch (e) {
      // Ignore audio errors on unsupported environments
    }
  };

  const startNewGame = () => {
    playCyberSound('click');
    const count = Math.random() < 0.5 ? 4 : 5;
    let code = String(Math.floor(Math.random() * 9) + 1);
    for (let i = 1; i < count; i++) {
      code += String(Math.floor(Math.random() * 10));
    }

    let sum = 0;
    let zeroFound = false;
    for (let i = 0; i < code.length; i++) {
      const d = parseInt(code[i], 10);
      sum += d;
      if (d === 0) zeroFound = true;
    }

    setDigitCount(count);
    setSecretCode(code);
    setDigitSum(sum);
    setHasZero(zeroFound);
    setCurrentAttempt(1);
    setGameOver(false);
    setGuessInput('');
    setHistory([
      `System ready. Enter a ${count}-digit code above.`,
      '----------------------------------------',
    ]);
  };

  const evaluateGuess = (guess) => {
    let exactMatch = 0;
    let digitMatch = 0;
    const secretUsed = Array(digitCount).fill(false);
    const guessUsed = Array(digitCount).fill(false);
    const exactDigits = [];
    const wrongPosDigits = [];

    for (let i = 0; i < digitCount; i++) {
      if (guess[i] === secretCode[i]) {
        exactMatch++;
        exactDigits.push(guess[i]);
        secretUsed[i] = true;
        guessUsed[i] = true;
      }
    }

    for (let i = 0; i < digitCount; i++) {
      if (guessUsed[i]) continue;
      for (let j = 0; j < digitCount; j++) {
        if (!secretUsed[j] && guess[i] === secretCode[j]) {
          digitMatch++;
          wrongPosDigits.push(guess[i]);
          secretUsed[j] = true;
          break;
        }
      }
    }

    const exactStr = exactDigits.length > 0 ? exactDigits.join(' ') : 'None';
    const wrongStr = wrongPosDigits.length > 0 ? wrongPosDigits.join(' ') : 'None';

    return (
      `  ✔ Positioned correctly (${exactMatch}): [ ${exactStr} ]\n` +
      `  ➜ Exists, wrong spot   (${digitMatch}): [ ${wrongStr} ]`
    );
  };

  const handleGuess = () => {
    if (gameOver) return;

    const guess = guessInput.trim();
    const regex = new RegExp(`^\\d{${digitCount}}$`);

    if (!regex.test(guess)) {
      playCyberSound('wrong');
      Alert.alert('Invalid Input', `Please enter a valid ${digitCount}-digit number!`);
      return;
    }

    setGuessInput('');

    // Win check
    if (guess === secretCode) {
      playCyberSound('win');
      setGameOver(true);
      setHistory((prev) => [
        ...prev,
        `Attempt ${currentAttempt}: ${guess} -> ACCESS GRANTED!`,
      ]);
      Alert.alert(
        'Access Granted! 🎉',
        `System breached! You cracked the code: ${secretCode}`,
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Play Again', onPress: startNewGame },
        ]
      );
      return;
    }

    // Wrong guess feedback
    const feedback = evaluateGuess(guess);
    setHistory((prev) => [
      ...prev,
      `Attempt ${currentAttempt}: [ ${guess} ]\n${feedback}`,
      '----------------------------------------',
    ]);

    const nextAttempt = currentAttempt + 1;
    if (nextAttempt > MAX_TRIES) {
      playCyberSound('gameover');
      setGameOver(true);
      Alert.alert(
        'System Lockout ❌',
        `You ran out of tries.\nThe secret code was: ${secretCode}`,
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Try Again', onPress: startNewGame },
        ]
      );
    } else {
      playCyberSound('wrong');
      setCurrentAttempt(nextAttempt);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_DARK} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Banner */}
        <View style={styles.headerBanner}>
          <Text style={styles.lockIcon}>🔒</Text>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>CIPHER BREAKER</Text>
            <Text style={styles.headerSubtitle}>Crack the hidden numeric passcode</Text>
          </View>
          <TouchableOpacity
            style={styles.soundToggle}
            onPress={() => setSoundEnabled((prev) => !prev)}
          >
            <Text style={styles.soundToggleText}>{soundEnabled ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
        </View>

        {/* Secret Code Clues Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SECRET CODE CLUES</Text>
          <Text style={styles.clueText}>• Total number of digits: {digitCount}</Text>
          <Text style={styles.clueText}>• Sum of all digits: {digitSum}</Text>
          {hasZero && (
            <Text style={styles.zeroClueText}>
              • Special Clue: The code contains at least one '0'!
            </Text>
          )}
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ENTER YOUR GUESS</Text>
          <Text
            style={[
              styles.attemptText,
              gameOver && currentAttempt >= MAX_TRIES && { color: COLORS.DANGER },
            ]}
          >
            {gameOver && currentAttempt >= MAX_TRIES
              ? 'Out of tries!'
              : `Attempt ${currentAttempt} of ${MAX_TRIES}`}
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={guessInput}
              onChangeText={(text) => {
                setGuessInput(text);
                if (text.length > guessInput.length) playCyberSound('click');
              }}
              placeholder={'•'.repeat(digitCount)}
              placeholderTextColor={COLORS.TEXT_MUTED}
              keyboardType="number-pad"
              maxLength={digitCount}
              editable={!gameOver}
              onSubmitEditing={handleGuess}
            />
            <TouchableOpacity
              style={[styles.crackButton, gameOver && styles.disabledButton]}
              onPress={handleGuess}
              disabled={gameOver}
            >
              <Text style={styles.crackButtonText}>CRACK CODE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Decryption Log Card */}
        <View style={[styles.card, styles.historyCard]}>
          <Text style={styles.cardTitle}>DECRYPTION LOG</Text>
          <ScrollView
            ref={scrollViewRef}
            style={styles.historyBox}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
          >
            {history.map((entry, idx) => (
              <Text key={idx} style={styles.historyText}>
                {entry}
              </Text>
            ))}
          </ScrollView>
        </View>

        {/* Bottom New Round Button */}
        <TouchableOpacity style={styles.newRoundButton} onPress={startNewGame}>
          <Text style={styles.newRoundText}>↻ Start New Round</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.HEADER_BG,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  lockIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: COLORS.ACCENT_CYAN,
    fontSize: 12,
    marginTop: 2,
  },
  soundToggle: {
    backgroundColor: COLORS.BG_DARK,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.ACCENT_CYAN,
  },
  soundToggleText: {
    fontSize: 18,
  },
  card: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cardTitle: {
    color: COLORS.TEXT_MUTED,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  clueText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  zeroClueText: {
    color: COLORS.ACCENT_AMBER,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  attemptText: {
    color: COLORS.ACCENT_CYAN,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: COLORS.ACCENT_CYAN,
    borderRadius: 8,
    paddingVertical: 8,
    marginRight: 10,
    letterSpacing: 6,
  },
  crackButton: {
    backgroundColor: COLORS.ACCENT_CYAN,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  crackButtonText: {
    color: COLORS.BG_DARK,
    fontSize: 13,
    fontWeight: 'bold',
  },
  historyCard: {
    flex: 1,
  },
  historyBox: {
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  historyText: {
    color: COLORS.TEXT_LIGHT,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 18,
  },
  newRoundButton: {
    backgroundColor: COLORS.CARD_BG,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.TEXT_MUTED,
  },
  newRoundText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: 14,
    fontWeight: 'bold',
  },
});