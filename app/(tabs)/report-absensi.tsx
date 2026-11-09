import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ==========================================
// KONFIGURASI
// ==========================================

const API_URL = "https://api.rsabojonegoro.com:3010/att/report/nipperiode";

const TIME_ZONE = "Asia/Jakarta";

// ==========================================
// TYPE DATA ABSENSI
// ==========================================

type AbsenItem = {
  id: number;
  nip: string;
  nama: string;
  tmsk: string;
  tplg: string;
  jmsk: string;
  jplg: string;
  shift: string;
  ruang: string;
};

// ==========================================
// TANGGAL HARI INI WIB
// ==========================================

const getToday = (): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const nilai = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return nilai("year") + "-" + nilai("month") + "-" + nilai("day");
};

// ==========================================
// TANGGAL 1 BULAN BERJALAN WIB
// ==========================================

const getFirstDayOfMonth = (): string => {
  const today = getToday();
  return `${today.substring(0, 7)}-01`;
};

// ==========================================
// FORMAT TANGGAL YYYY-MM-DD
// ==========================================

const formatBackendDate = (date: Date): string => {
  const yyyy = date.getFullYear();

  const mm = String(date.getMonth() + 1).padStart(2, "0");

  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

// ==========================================
// MENGUBAH STRING KE DATE PICKER
// ==========================================

const toDateObject = (tanggal: string): Date => {
  const [yyyy, mm, dd] = tanggal.split("-");

  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0);
};

// ==========================================
// AMBIL TANGGAL DARI API
// ==========================================

const ambilTanggal = (value?: string): string => {
  if (!value) return "";

  // Mendukung format:
  // 2026-11-04
  // 2026-11-04T00:00:00
  // 2026-11-04 00:00:00
  //
  // Untuk tanggal presensi yang disimpan
  // sebagai tanggal kalender, jangan
  // dikonversi lagi menggunakan UTC.

  const cocok = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (cocok) {
    return `${cocok[1]}-${cocok[2]}-${cocok[3]}`;
  }

  return "";
};

// ==========================================
// TAMPILAN TANGGAL BAHASA INDONESIA
// ==========================================

const formatDisplayDate = (
  tanggal: string,
  barisBaru: boolean = false
): string => {
  const bersih = ambilTanggal(tanggal);

  if (!bersih) return "-";

  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const [yyyy, mm, dd] = bersih.split("-");

  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const namaHari = hari[date.getDay()];

  const pemisah = barisBaru ? ",\n" : ", ";

  return `${namaHari}${pemisah}${dd}-${mm}-${yyyy}`;
};

// ==========================================
// FORMAT JAM DARI API
// ==========================================

const formatJam = (jam?: string): string => {
  if (!jam) return "-";

  const value = String(jam);

  // HH:mm:ss atau HH:mm
  const cocokJam = value.match(/(?:^|T|\s)(\d{2}):(\d{2})/);

  if (cocokJam) {
    return `${cocokJam[1]}:${cocokJam[2]}`;
  }

  return "-";
};

// ==========================================
// HALAMAN REPORT ABSENSI
// ==========================================

export default function ReportAbsensiScreen() {
  const params = useLocalSearchParams<{
    nip?: string;
    nm?: string;
    room?: string;
    foto?: string;
  }>();

  const [loading, setLoading] = useState(false);

  const [dataAbsen, setDataAbsen] = useState<AbsenItem[]>([]);

  // TANGGAL OTOMATIS WIB
  const [bDate, setBDate] = useState<string>(getFirstDayOfMonth);

  const [eDate, setEDate] = useState<string>(getToday);

  const [showBDatePicker, setShowBDatePicker] = useState(false);

  const [showEDatePicker, setShowEDatePicker] = useState(false);

  // ========================================
  // AMBIL DATA LAPORAN
  // ========================================

  const getRiwayat = async (
    tanggalAwal: string = bDate,
    tanggalAkhir: string = eDate
  ) => {
    if (!params.nip) {
      Alert.alert("Gagal", "NIP karyawan tidak ditemukan.");
      return;
    }

    if (tanggalAwal > tanggalAkhir) {
      Alert.alert(
        "Periode Tidak Valid",
        "Tanggal awal tidak boleh melebihi tanggal akhir."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        API_URL,
        {
          nip: params.nip,
          bDate: tanggalAwal,
          eDate: tanggalAkhir,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      const hasil = response.data?.response;

      setDataAbsen(Array.isArray(hasil) ? hasil : []);
    } catch (error: any) {
      console.log("ERROR REPORT:", error?.response?.data || error?.message);

      setDataAbsen([]);

      Alert.alert(
        "Data Tidak Ditemukan",
        error?.response?.data?.metadata?.message ||
          error?.response?.data?.message ||
          "Riwayat absensi tidak ditemukan."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // LOAD LAPORAN PERTAMA KALI
  // ========================================

  useEffect(() => {
    const awalWIB = getFirstDayOfMonth();
    const akhirWIB = getToday();

    setBDate(awalWIB);
    setEDate(akhirWIB);

    void getRiwayat(awalWIB, akhirWIB);
  }, []);

  // ========================================
  // KEMBALI KE HOME
  // ========================================

  const kembaliHome = () => {
    router.replace({
      pathname: "/home",
      params: {
        nip: params.nip,
        nm: params.nm,
        room: params.room,
        foto: params.foto,
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={kembaliHome}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>Report Absensi</Text>

            <Text style={styles.headerSubtitle}>{params.nm || "-"}</Text>
          </View>
        </View>

        {/* FILTER TANGGAL */}
        <View style={styles.filterCard}>
          <View style={styles.dateRow}>
            {/* TANGGAL AWAL */}
            <View style={styles.dateCol}>
              <Text style={styles.inputLabel}>Tanggal Awal</Text>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowBDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formatDisplayDate(bDate, true)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* TANGGAL AKHIR */}
            <View style={styles.dateCol}>
              <Text style={styles.inputLabel}>Tanggal Akhir</Text>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formatDisplayDate(eDate, true)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* DATE PICKER AWAL */}
          {showBDatePicker && (
            <DateTimePicker
              value={toDateObject(bDate)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={(event, selectedDate) => {
                setShowBDatePicker(false);

                if (event.type !== "dismissed" && selectedDate) {
                  setBDate(formatBackendDate(selectedDate));
                }
              }}
            />
          )}

          {/* DATE PICKER AKHIR */}
          {showEDatePicker && (
            <DateTimePicker
              value={toDateObject(eDate)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={(event, selectedDate) => {
                setShowEDatePicker(false);

                if (event.type !== "dismissed" && selectedDate) {
                  setEDate(formatBackendDate(selectedDate));
                }
              }}
            />
          )}

          {/* TOMBOL REPORT */}
          <TouchableOpacity
            style={[styles.filterButton, loading && styles.disabledButton]}
            onPress={() => void getRiwayat()}
            disabled={loading}
          >
            <Text style={styles.filterButtonText}>Tampilkan Report</Text>
          </TouchableOpacity>
        </View>

        {/* LOADING */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1565C0"
            style={{ marginTop: 40 }}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.listContainer}>
            {/* HEADER TABEL */}
            <View style={styles.tableHeader}>
              <Text style={styles.colTanggalHeader}>Tanggal</Text>

              <Text style={styles.colShiftHeader}>Shift</Text>

              <Text style={styles.colJamHeader}>Masuk</Text>

              <Text style={styles.colJamHeader}>Pulang</Text>
            </View>

            {/* DATA ABSENSI */}
            {dataAbsen.length > 0 ? (
              dataAbsen.map((item, index) => (
                <View
                  key={`${item.id}-${index}`}
                  style={[
                    styles.absenRow,
                    index === dataAbsen.length - 1 && styles.lastRow,
                  ]}
                >
                  <Text style={styles.colTanggal}>
                    {formatDisplayDate(item.tmsk)}
                  </Text>

                  <Text style={styles.colShift}>{item.shift || "-"}</Text>

                  <Text style={styles.colJam}>{formatJam(item.jmsk)}</Text>

                  <Text style={styles.colJam}>{formatJam(item.jplg)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Tidak Ada Data Absensi</Text>

                <Text style={styles.emptyText}>
                  Silakan pilih periode tanggal dan tampilkan laporan kembali.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  header: {
    backgroundColor: "#1565C0",
    paddingTop: 48,
    paddingBottom: 30,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: -2,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#DCEBFF",
    fontSize: 13,
    marginTop: 3,
  },

  filterCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 22,
    marginTop: -18,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    elevation: 5,
  },

  dateRow: {
    flexDirection: "row",
    gap: 12,
  },

  dateCol: {
    flex: 1,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginBottom: 6,
    marginTop: 10,
  },

  dateButton: {
    backgroundColor: "#F5F7FB",
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 64,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },

  dateButtonText: {
    fontSize: 14,
    color: "#222",
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 20,
  },

  filterButton: {
    backgroundColor: "#1565C0",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },

  disabledButton: {
    opacity: 0.5,
  },

  filterButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  listContainer: {
    padding: 22,
    paddingBottom: 40,
    overflow: "hidden",
    borderRadius: 16,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1565C0",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },

  absenRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  colTanggalHeader: {
    flex: 2.2,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  colShiftHeader: {
    flex: 0.6,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  colJamHeader: {
    flex: 0.9,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  colTanggal: {
    flex: 2.2,
    color: "#222",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  colShift: {
    flex: 0.6,
    color: "#1565C0",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },

  colJam: {
    flex: 0.9,
    color: "#333",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  lastRow: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 0,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 28,
    alignItems: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },

  emptyTitle: {
    color: "#555",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: "#888",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
});
