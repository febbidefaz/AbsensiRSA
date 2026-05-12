import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const karyawan = useLocalSearchParams<{
    nip?: string;
    nm?: string;
    room?: string;
    foto?: string;
  }>();
  const [modalAksi, setModalAksi] = React.useState(false);
  const [modalShift, setModalShift] = React.useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = React.useState(false);
  const [scanned, setScanned] = React.useState(false);
  const [shiftTerpilih, setShiftTerpilih] = React.useState<
    "P" | "S" | "M" | null
  >(null);

  const [aksiAbsen, setAksiAbsen] = React.useState<"masuk" | "pulang" | null>(
    null,
  );

  const pilihAksi = (aksi: "masuk" | "pulang") => {
    setAksiAbsen(aksi);
    setModalAksi(false);

    setTimeout(() => {
      setModalShift(true);
    }, 250);
  };

  const pilihShift = async (shift: "P" | "S" | "M") => {
    setModalShift(false);
    setShiftTerpilih(shift);
    setScanned(false);

    if (!permission?.granted) {
      const hasil = await requestPermission();

      if (!hasil.granted) {
        Alert.alert(
          "Izin Kamera",
          "Izin kamera diperlukan untuk scan barcode.",
        );
        return;
      }
    }

    setTimeout(() => {
      setShowScanner(true);
    }, 300);
  };

  const kirimPresensi = async (shift: "P" | "S" | "M") => {
    setModalShift(false);

    try {
      const url = "http://app.rsabojonegoro.com:3000/att/presensi";

      const payload = {
        nip: karyawan.nip,
        shift: shift,
      };

      const response =
        aksiAbsen === "masuk"
          ? await axios.post(url, payload, {
              headers: { "Content-Type": "application/json" },
            })
          : await axios.put(url, payload, {
              headers: { "Content-Type": "application/json" },
            });

      Alert.alert(
        "Berhasil",
        response.data?.metadata?.message ||
          `Presensi ${aksiAbsen} berhasil disimpan.`,
      );
    } catch (error: any) {
      console.log("ERROR PRESENSI:", error?.response?.data || error.message);

      Alert.alert(
        "Gagal",
        error?.response?.data?.message ||
          error?.response?.data?.metadata?.message ||
          "Presensi gagal diproses.",
      );
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setShowScanner(false);

    try {
      const kodeNumber = Number(data);

      if (Number.isNaN(kodeNumber)) {
        Alert.alert("QR Tidak Valid", "Kode QR harus berupa angka.");
        return;
      }

      await axios.post(
        "http://app.rsabojonegoro.com:3000/att/kodepresensi",
        {
          kode: kodeNumber,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!shiftTerpilih) {
        Alert.alert("Gagal", "Shift belum dipilih.");
        return;
      }

      await kirimPresensi(shiftTerpilih);
    } catch (error: any) {
      console.log("ERROR QR:", error?.response?.data || error.message);

      Alert.alert(
        "QR Salah",
        error?.response?.data?.message ||
          error?.response?.data?.metadata?.message ||
          "Kode QR tidak sesuai.",
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require("../assets/images/logorsa.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />

            <View>
              <Text style={styles.headerTitle}>Absensi</Text>
              <Text style={styles.headerSubtitle}>RS Aisyiyah Bojonegoro</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.removeItem("karyawan");
              router.replace("/login");
            }}
          ></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileCard}>
            <Image
              source={
                karyawan.foto
                  ? { uri: `data:image/jpeg;base64,${karyawan.foto}` }
                  : require("../assets/images/logorsa.png")
              }
              style={styles.foto}
              resizeMode="cover"
            />

            <Text style={styles.name}>{karyawan.nm || "-"}</Text>
            <Text style={styles.unit}>{karyawan.room || "-"}</Text>

            <View style={styles.nipBox}>
              <Text style={styles.nipLabel}>NIP</Text>
              <Text style={styles.nipText}>{karyawan.nip || "-"}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Menu Absensi</Text>

          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={[styles.menuCard, styles.scanCard]}
              onPress={() => setModalAksi(true)}
            >
              <Ionicons
                name="qr-code"
                size={42}
                color="#FFD54F"
                style={styles.menuIconModern}
              />
              <Text style={styles.menuTitle}>Scan Barcode</Text>
              <Text style={styles.menuDesc}>
                Lakukan presensi masuk / pulang
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuCard, styles.historyCard]}
              onPress={() =>
                router.push({
                  pathname: "/report-absensi",
                  params: {
                    nip: karyawan.nip,
                    nm: karyawan.nm,
                    room: karyawan.room,
                    foto: karyawan.foto,
                  },
                })
              }
            >
              <Ionicons
                name="time"
                size={42}
                color="#B2FF59"
                style={styles.menuIconModern}
              />
              <Text style={styles.menuTitle}>Riwayat Absen</Text>
              <Text style={styles.menuDesc}>
                Lihat histori presensi pegawai
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal visible={modalAksi} transparent animationType="slide">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setModalAksi(false)}
          >
            <Pressable style={styles.modalBox}>
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

        <Modal visible={modalShift} transparent animationType="slide">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setModalShift(false)}
          >
            <Pressable style={styles.modalBox}>
              <Text style={styles.modalTitle}>Pilih Shift</Text>

              <Pressable
                style={styles.modalItem}
                onPress={() => pilihShift("P")}
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
                onPress={() => pilihShift("S")}
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
                onPress={() => pilihShift("M")}
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

        {showScanner && (
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "code128"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            <View style={styles.scannerOverlay}>
              <Text style={styles.scannerTitle}>Scan QR Presensi</Text>
              <Text style={styles.scannerSubtitle}>
                Arahkan kamera ke kode QR absensi
              </Text>

              <TouchableOpacity
                style={styles.scannerCancel}
                onPress={() => setShowScanner(false)}
              >
                <Text style={styles.scannerCancelText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    backgroundColor: "#1565C0",

    paddingTop: 35,
    paddingBottom: 15,
    paddingHorizontal: 22,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 10,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#DCEBFF",
    fontSize: 12,
    marginTop: 1,
    fontWeight: "500",
  },
  logoutTop: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  content: {
    padding: 22,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    elevation: 5,
  },
  foto: {
    width: 132,
    height: 160,
    borderRadius: 18,
    backgroundColor: "#EEEEEE",
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
    textAlign: "center",
  },
  unit: {
    fontSize: 15,
    fontWeight: "600",
    color: "#087B3E",
    marginTop: 6,
  },
  nipBox: {
    marginTop: 18,
    backgroundColor: "#F1F3F6",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
  },
  nipLabel: {
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
  },
  nipText: {
    color: "#2B145F",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
    marginTop: 26,
    marginBottom: 14,
  },
  menuGrid: {
    flexDirection: "row",
    gap: 14,
  },
  menuCard: {
    flex: 1,
    borderRadius: 22,
    padding: 18,
    minHeight: 150,

    justifyContent: "center",
    alignItems: "center",

    elevation: 4,
  },
  scanCard: {
    backgroundColor: "#1565C0",
  },
  historyCard: {
    backgroundColor: "#087B3E",
  },
  menuIcon: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 10,
  },
  menuTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  menuDesc: {
    color: "#EEF2FF",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#FFF9E8",
    borderRadius: 18,
    padding: 16,
    marginTop: 22,
  },
  infoTitle: {
    color: "#8A6500",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  infoText: {
    color: "#6E5A1A",
    fontSize: 13,
    lineHeight: 19,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerLogo: {
    width: 42,
    height: 42,
    marginRight: 12,
  },

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

  modalIcon: {
    fontSize: 20,
    width: 35,
    color: "#111",
  },

  modalText: {
    fontSize: 20,
    color: "#333",
    fontWeight: "500",
  },

  modalCancel: {
    alignItems: "center",
    paddingVertical: 14,
  },

  modalCancelText: {
    fontSize: 20,
    color: "#777",
    fontWeight: "700",
  },

  iconModern: {
    width: 35,
    marginRight: 8,
  },
  menuIconModern: {
    marginBottom: 12,
    alignSelf: "center",
  },

  scannerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 99,
  },

  camera: {
    flex: 1,
  },

  scannerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: "center",
    paddingHorizontal: 24,
  },

  scannerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },

  scannerSubtitle: {
    color: "#E0E0E0",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 18,
  },

  scannerCancel: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
  },

  scannerCancelText: {
    color: "#1565C0",
    fontSize: 16,
    fontWeight: "800",
  },
});
