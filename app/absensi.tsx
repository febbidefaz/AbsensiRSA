import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE = "https://api.rsabojonegoro.com:3010/att";
const LOKASI_ID = 2; // ID dari SQL Server: RS Aisyiyah Bojonegoro

type Shift = "P" | "S" | "M";
type Aksi = "masuk" | "pulang";
type Konfigurasi = {
  id: number;
  namaLokasi: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  akurasiMaksMeter: number;
};
type Posisi = {
  latitude: number;
  longitude: number;
  accuracy: number;
  jarak: number;
};
type Hasil = {
  jenis: "masuk" | "pulang" | "peringatan" | "luarArea";
  judul: string;
  pesan: string;
  shift?: Shift;
};

const jarakMeter = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (angka: number) => (angka * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return (
    2 *
    6371000 *
    Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)))
  );
};

const pesanAPI = (body: any, fallback: string): string => {
  const value = body?.metadata?.message ?? body?.message ?? body?.error;
  return typeof value === "string" && value.trim() ? value : fallback;
};

const judulPeringatan = (message: string): string => {
  const m = message.toLowerCase();
  if (/di luar radius|di luar area|luar radius|outside radius/.test(m)) {
    return "Di Luar Area Absensi!";
  }
  if (
    /sudah|telah|duplikat|duplicate/.test(m) &&
    /absen|presensi|check.in|check.out/.test(m)
  ) {
    return "Sudah Ada Absensi!";
  }
  if (
    /tidak ada|belum|not found/.test(m) &&
    /check.in|masuk|presensi/.test(m)
  ) {
    return "Belum Absen Masuk!";
  }
  return "Absensi Tidak Berhasil";
};

const namaShift = (shift?: Shift) =>
  (({ P: "Pagi", S: "Sore", M: "Malam" } as const)[shift ?? "P"]);

export default function AbsensiKoordinat() {
  const params = useLocalSearchParams<{ nip?: string }>();
  const [config, setConfig] = useState<Konfigurasi | null>(null);
  const [posisi, setPosisi] = useState<Posisi | null>(null);
  const [aksi, setAksi] = useState<Aksi | null>(null);
  const [modalAksi, setModalAksi] = useState(false);
  const [modalShift, setModalShift] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const animasi = useRef(new Animated.Value(0.4)).current;
  const sedangProses = useRef(false);

  useEffect(() => {
    void muatKonfigurasi();
  }, []);

  useEffect(() => {
    if (!hasil) return;
    animasi.setValue(0.4);
    Animated.spring(animasi, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [hasil, animasi]);

  async function ambilKonfigurasi(): Promise<Konfigurasi> {
    const response = await axios.get(
      `${API_BASE}/lokasi-absensi/${LOKASI_ID}`,
      { timeout: 12000 }
    );
    const data = response.data;
    const next: Konfigurasi = {
      id: Number(data.id),
      namaLokasi: String(data.namaLokasi ?? "RS Aisyiyah Bojonegoro"),
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radiusMeter: Number(data.radiusMeter),
      akurasiMaksMeter: Number(data.akurasiMaksMeter),
    };
    if (
      next.id !== LOKASI_ID ||
      !Number.isFinite(next.latitude) ||
      !Number.isFinite(next.longitude) ||
      Math.abs(next.latitude) > 90 ||
      Math.abs(next.longitude) > 180 ||
      !Number.isFinite(next.radiusMeter) ||
      next.radiusMeter <= 0 ||
      !Number.isFinite(next.akurasiMaksMeter) ||
      next.akurasiMaksMeter <= 0
    ) {
      throw new Error("Data konfigurasi lokasi dari server tidak valid.");
    }
    return next;
  }

  async function muatKonfigurasi() {
    setLoadingConfig(true);
    setConfig(null);
    setPosisi(null);
    setAksi(null);
    setModalAksi(false);
    setModalShift(false);
    try {
      setConfig(await ambilKonfigurasi());
    } catch (error: any) {
      Alert.alert(
        "Gagal Memuat Lokasi",
        error?.message ?? "Tidak dapat membaca lokasi dari server."
      );
    } finally {
      setLoadingConfig(false);
    }
  }

  async function ambilGPS(konfigurasi: Konfigurasi): Promise<Posisi> {
    if (!(await Location.hasServicesEnabledAsync())) {
      throw new Error("GPS tidak aktif. Aktifkan layanan lokasi pada HP.");
    }
    const izin = await Location.requestForegroundPermissionsAsync();
    if (izin.status !== "granted") {
      throw new Error(
        "Izin GPS ditolak. Aktifkan izin lokasi untuk E-SDI RSA."
      );
    }
    const result = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    const latitude = result.coords.latitude;
    const longitude = result.coords.longitude;
    const accuracy = result.coords.accuracy ?? 9999;
    if (
      ![latitude, longitude, accuracy].every(Number.isFinite) ||
      accuracy <= 0
    ) {
      throw new Error("Hasil pembacaan koordinat GPS tidak valid.");
    }
    return {
      latitude,
      longitude,
      accuracy,
      jarak: jarakMeter(
        latitude,
        longitude,
        konfigurasi.latitude,
        konfigurasi.longitude
      ),
    };
  }

  function cekBatas(gps: Posisi, konfigurasi: Konfigurasi) {
    if (gps.accuracy > konfigurasi.akurasiMaksMeter) {
      throw new Error(
        `GPS kurang akurat: ±${Math.round(gps.accuracy)} m. Maksimal ±${
          konfigurasi.akurasiMaksMeter
        } m.`
      );
    }
    if (gps.jarak > konfigurasi.radiusMeter) {
      throw new Error(
        `Di luar radius absensi: jarak ${Math.round(gps.jarak)} m, batas ${
          konfigurasi.radiusMeter
        } m.`
      );
    }
  }

  async function periksaLokasi() {
    if (sedangProses.current) return;
    sedangProses.current = true;
    setLoading(true);
    setAksi(null);
    setModalAksi(false);
    setModalShift(false);
    setPosisi(null);
    try {
      const terbaru = await ambilKonfigurasi();
      setConfig(terbaru);
      const gps = await ambilGPS(terbaru);
      setPosisi(gps);
      cekBatas(gps, terbaru);
      setModalAksi(true);
    } catch (error: any) {
      tampilPeringatan(error?.message ?? "Gagal memeriksa lokasi GPS.");
    } finally {
      sedangProses.current = false;
      setLoading(false);
    }
  }

  function tampilPeringatan(message: string) {
    const luarArea =
      /di luar radius|di luar area|luar radius|outside radius/i.test(message);
    if (luarArea) {
      setAksi(null);
    }
    setHasil({
      jenis: luarArea ? "luarArea" : "peringatan",
      judul: judulPeringatan(message),
      pesan: message,
    });
  }

  function pilihAksi(terpilih: Aksi) {
    if (!lokasiValid || loading) return;
    setAksi(terpilih);
    setModalAksi(false);
    setTimeout(() => setModalShift(true), 250);
  }

  async function kirimPresensi(shift: Shift) {
    if (!aksi || !config || !posisi || sedangProses.current) return;
    sedangProses.current = true;
    setModalShift(false);
    setLoading(true);
    try {
      // Selalu cek data SQL Server dan GPS terbaru sebelum menyimpan.
      const terbaru = await ambilKonfigurasi();
      setConfig(terbaru);
      const gps = await ambilGPS(terbaru);
      setPosisi(gps);
      cekBatas(gps, terbaru);

      const simpan = await AsyncStorage.getItem("karyawan");
      const karyawan = simpan ? JSON.parse(simpan) : null;
      const nip = karyawan?.nip ?? params.nip;
      if (!nip)
        throw new Error("Data NIP tidak tersedia. Silakan login kembali.");

      const payload = {
        nip: String(nip),
        shift,
        lokasiId: terbaru.id,
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy,
        metode: "GPS",
      };
      const url = `${API_BASE}/presensi/gps`;
      const response =
        aksi === "masuk"
          ? await axios.post(url, payload, { timeout: 15000 })
          : await axios.put(url, payload, { timeout: 15000 });
      const code = Number(response.data?.metadata?.code ?? response.status);
      if (code < 200 || code >= 300) {
        tampilPeringatan(pesanAPI(response.data, "Absensi ditolak server."));
        return;
      }
      setHasil({
        jenis: aksi,
        judul:
          aksi === "masuk" ? "Absen Masuk Berhasil!" : "Absen Pulang Berhasil!",
        pesan: pesanAPI(response.data, "Data presensi berhasil disimpan."),
        shift,
      });
      setAksi(null);
    } catch (error: any) {
      const message = axios.isAxiosError(error)
        ? pesanAPI(
            error.response?.data,
            error.message || "Gagal menghubungi server."
          )
        : error?.message ?? "Absensi gagal diproses.";
      tampilPeringatan(message);
    } finally {
      sedangProses.current = false;
      setLoading(false);
    }
  }

  const lokasiValid = Boolean(
    config &&
      posisi &&
      posisi.jarak <= config.radiusMeter &&
      posisi.accuracy <= config.akurasiMaksMeter
  );
  const warna =
    hasil?.jenis === "masuk"
      ? "#087B3E"
      : hasil?.jenis === "pulang"
      ? "#1565C0"
      : hasil?.jenis === "luarArea"
      ? "#795548"
      : "#DA8B00";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityLabel="Kembali"
          >
            <Ionicons name="arrow-back" color="#FFFFFF" size={26} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Absensi Koordinat</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Ionicons name="location" color="#087B3E" size={65} />
            <Text style={styles.title}>
              {config?.namaLokasi ?? "RS Aisyiyah Bojonegoro"}
            </Text>
            {loadingConfig ? (
              <ActivityIndicator
                size="large"
                color="#1565C0"
                style={{ marginVertical: 16 }}
              />
            ) : null}
            <View style={styles.info}>
              <Text style={styles.label}>Radius Maksimal</Text>
              <Text style={styles.value}>
                {config ? `${config.radiusMeter} meter` : "-"}
              </Text>
              <Text style={styles.label}>Jarak Anda</Text>
              <Text style={styles.value}>
                {posisi ? `${Math.round(posisi.jarak)} meter` : "-"}
              </Text>
              <Text style={styles.label}>Akurasi GPS</Text>
              <Text style={styles.value}>
                {posisi ? `±${Math.round(posisi.accuracy)} meter` : "-"}
              </Text>
              <Text style={styles.label}>Batas Akurasi</Text>
              <Text style={styles.value}>
                {config ? `±${config.akurasiMaksMeter} meter` : "-"}
              </Text>
            </View>
            <View
              style={[
                styles.status,
                { backgroundColor: lokasiValid ? "#E6F6ED" : "#FFF3E0" },
              ]}
            >
              <Ionicons
                name={lokasiValid ? "checkmark-circle" : "alert-circle"}
                color={lokasiValid ? "#087B3E" : "#DA8B00"}
                size={22}
              />
              <Text
                style={{
                  color: lokasiValid ? "#087B3E" : "#9A6500",
                  fontWeight: "700",
                  flex: 1,
                }}
              >
                {lokasiValid
                  ? "Koordinat sesuai, silakan pilih absensi"
                  : "Periksa koordinat GPS terlebih dahulu"}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.mainButton,
                (!config || loading) && styles.disabled,
              ]}
              disabled={!config || loading}
              onPress={periksaLokasi}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="navigate" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.buttonText}>Periksa Koordinat GPS</Text>
            </TouchableOpacity>
          </View>

          {lokasiValid && !hasil && (
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: "#087B3E" }]}
              disabled={loading}
              onPress={() => setModalAksi(true)}
            >
              <Ionicons name="checkmark-circle" size={23} color="#FFFFFF" />
              <Text style={styles.buttonText}>Pilih Masuk / Pulang</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* MODAL AKSI: SAMA SEPERTI MENU HOME */}
      <Modal
        visible={modalAksi}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAksi(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalAksi(false)}
        >
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Pilih Aksi</Text>
            <Pressable
              style={styles.modalItem}
              onPress={() => pilihAksi("masuk")}
            >
              <Ionicons
                name="log-in"
                size={30}
                color="#4CAF50"
                style={styles.iconModern}
              />
              <Text style={styles.modalText}>Masuk</Text>
            </Pressable>
            <Pressable
              style={styles.modalItem}
              onPress={() => pilihAksi("pulang")}
            >
              <Ionicons
                name="log-out"
                size={30}
                color="#F44336"
                style={styles.iconModern}
              />
              <Text style={styles.modalText}>Pulang</Text>
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              onPress={() => setModalAksi(false)}
            >
              <Text style={styles.modalCancelText}>batal</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL SHIFT: SAMA SEPERTI MENU HOME */}
      <Modal
        visible={modalShift}
        transparent
        animationType="slide"
        onRequestClose={() => setModalShift(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalShift(false)}
        >
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Pilih Shift</Text>
            <Pressable
              style={styles.modalItem}
              disabled={loading}
              onPress={() => void kirimPresensi("P")}
            >
              <Ionicons
                name="partly-sunny"
                size={28}
                color="#FF9800"
                style={styles.iconModern}
              />
              <Text style={styles.modalText}>Pagi</Text>
            </Pressable>
            <Pressable
              style={styles.modalItem}
              disabled={loading}
              onPress={() => void kirimPresensi("S")}
            >
              <Ionicons
                name="sunny"
                size={28}
                color="#FF5722"
                style={styles.iconModern}
              />
              <Text style={styles.modalText}>Sore</Text>
            </Pressable>
            <Pressable
              style={styles.modalItem}
              disabled={loading}
              onPress={() => void kirimPresensi("M")}
            >
              <Ionicons
                name="moon"
                size={28}
                color="#3F51B5"
                style={styles.iconModern}
              />
              <Text style={styles.modalText}>Malam</Text>
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              onPress={() => setModalShift(false)}
            >
              <Text style={styles.modalCancelText}>batal</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={hasil !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setHasil(null);
          setAksi(null);
          setPosisi(null);
        }}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[styles.modalCard, { transform: [{ scale: animasi }] }]}
          >
            <View
              style={[
                styles.resultIcon,
                {
                  backgroundColor:
                    hasil?.jenis === "luarArea" ? "#EFEBE9" : `${warna}16`,
                },
              ]}
            >
              <Ionicons
                name={
                  hasil?.jenis === "peringatan" || hasil?.jenis === "luarArea"
                    ? "alert-circle"
                    : "checkmark-circle"
                }
                color={warna}
                size={88}
              />
            </View>
            <Text style={[styles.resultTitle, { color: warna }]}>
              {hasil?.judul}
            </Text>
            {hasil?.shift ? (
              <Text style={styles.shiftResult}>
                Shift {namaShift(hasil.shift)}
              </Text>
            ) : null}
            <Text style={styles.resultMessage}>{hasil?.pesan}</Text>
            <TouchableOpacity
              style={[styles.resultButton, { backgroundColor: warna }]}
              onPress={() => {
                setHasil(null);
                setAksi(null);
                setPosisi(null);
              }}
            >
              <Text style={styles.buttonText}>Tutup</Text>
            </TouchableOpacity>
            {hasil?.jenis !== "peringatan" ? (
              <TouchableOpacity
                onPress={() => {
                  setHasil(null);
                  router.back();
                }}
                style={{ padding: 12 }}
              >
                <Text style={{ color: "#1565C0", fontWeight: "700" }}>
                  Kembali ke Home
                </Text>
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FB" },
  header: {
    backgroundColor: "#1565C0",
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 47,
    paddingBottom: 21,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 21,
    alignItems: "center",
    elevation: 3,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    color: "#2B145F",
    fontWeight: "800",
    marginVertical: 12,
  },
  info: {
    backgroundColor: "#F5F7FB",
    padding: 18,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    gap: 4,
  },
  label: { fontSize: 13, color: "#747474", marginTop: 8 },
  value: { fontSize: 20, color: "#202020", fontWeight: "800" },
  status: {
    marginTop: 15,
    padding: 14,
    borderRadius: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  mainButton: {
    backgroundColor: "#2B145F",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  disabled: { opacity: 0.5 },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    color: "#2B145F",
    fontWeight: "800",
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  row: { width: "100%", flexDirection: "row", gap: 10 },
  option: {
    flex: 1,
    minHeight: 90,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  shift: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 14,
    backgroundColor: "#F0EEF8",
    alignItems: "center",
    gap: 8,
  },
  shiftText: { color: "#2B145F", fontSize: 15, fontWeight: "800" },
  hint: {
    color: "#777",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 25,
    alignItems: "center",
  },
  resultIcon: {
    width: 115,
    height: 115,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  shiftResult: { fontSize: 18, fontWeight: "700", color: "#2B145F" },
  resultMessage: {
    fontSize: 19,
    lineHeight: 29,
    fontWeight: "700",
    textAlign: "center",
    color: "#333",
    marginVertical: 20,
  },
  resultButton: { width: "100%", padding: 16, borderRadius: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2B145F",
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2B145F",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  modalText: {
    fontSize: 20,
    color: "#333333",
    fontWeight: "500",
  },
  modalCancel: { alignItems: "center", paddingVertical: 14 },
  modalCancelText: { fontSize: 20, color: "#777777", fontWeight: "700" },
  iconModern: { width: 35, marginRight: 8 },
});
