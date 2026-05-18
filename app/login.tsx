import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const [nip, setNip] = useState("");
  const [tgl, setTgl] = useState("");
  const [loading, setLoading] = useState(false);

  const formatTanggal = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 8);
    let formatted = cleaned;

    if (cleaned.length > 2) {
      formatted = cleaned.slice(0, 2) + "-" + cleaned.slice(2);
    }

    if (cleaned.length > 4) {
      formatted =
        cleaned.slice(0, 2) +
        "-" +
        cleaned.slice(2, 4) +
        "-" +
        cleaned.slice(4, 8);
    }

    setTgl(formatted);
  };

  const convertToBackendDate = (date: string) => {
    const [dd, mm, yyyy] = date.split("-");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleLogin = async () => {
    if (!nip || !tgl) {
      Alert.alert("Data Belum Lengkap", "Mohon isi NIP dan tanggal lahir.");
      return;
    }

    if (tgl.length !== 10) {
      Alert.alert("Format Salah", "Tanggal lahir harus dd-mm-yyyy.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "https://api.rsabojonegoro.com:3010/att/Karyawan",
        {
          nip: nip,
          tgl: convertToBackendDate(tgl),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const dataKaryawan =
        response.data?.response || response.data?.data || response.data;

      await AsyncStorage.setItem("karyawan", JSON.stringify(dataKaryawan));

      router.push({
        pathname: "/home",
        params: {
          nip: dataKaryawan.nip,
          nm: dataKaryawan.nm,
          room: dataKaryawan.room,
          foto: dataKaryawan.foto,
        },
      });
    } catch (error: any) {
      const backendDate = convertToBackendDate(tgl);

      console.log("LOGIN PAYLOAD:", {
        nip: nip.trim(),
        tgl: backendDate,
      });

      console.log("LOGIN ERROR:", error?.response?.data || error.message);

      Alert.alert(
        "Login Gagal",
        "NIP atau tanggal lahir tidak ditemukan, silahkan kontak PSDI",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8F5" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.container}>
        <View style={styles.card}>
          <Image
            source={require("../assets/images/logorsa.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>E-SDI</Text>
          <Text style={styles.subtitle}>RS Aisyiyah Bojonegoro</Text>

          <Text style={styles.label}>NIP</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan NIP"
            placeholderTextColor="#888"
            value={nip}
            onChangeText={setNip}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Tanggal Lahir</Text>
          <TextInput
            style={styles.input}
            placeholder="dd-mm-yyyy"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            maxLength={10}
            value={tgl}
            onChangeText={formatTanggal}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            Gunakan NIP dan tanggal lahir sesuai data PSDI
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8F5",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    elevation: 6,
  },
  logo: {
    width: 110,
    height: 110,
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2B145F",
    textAlign: "center",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#087B3E",
    textAlign: "center",
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 18,
  },
  button: {
    backgroundColor: "#087B3E",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  note: {
    textAlign: "center",
    color: "#777",
    fontSize: 12,
    marginTop: 18,
  },
});
