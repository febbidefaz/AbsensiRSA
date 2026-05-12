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

const getToday = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const getFirstDayOfMonth = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

const formatJam = (jam?: string) => {
  if (!jam) return "-";
  return jam.slice(0, 5);
};

export default function ReportAbsensiScreen() {
  const params = useLocalSearchParams<{
    nip?: string;
    nm?: string;
    room?: string;
    foto?: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [dataAbsen, setDataAbsen] = useState<AbsenItem[]>([]);
  const [bDate, setBDate] = useState(getFirstDayOfMonth());
  const [eDate, setEDate] = useState(getToday());

  const formatDisplayDate = (date: string) => {
    const hari = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];

    const [yyyy, mm, dd] = date.split("-");

    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

    const namaHari = hari[d.getDay()];

    return `${namaHari}, ${dd}-${mm}-${yyyy}`;
  };

  const toDateObject = (date: string) => {
    const [yyyy, mm, dd] = date.split("-");
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  };

  const formatBackendDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [showBDatePicker, setShowBDatePicker] = useState(false);
  const [showEDatePicker, setShowEDatePicker] = useState(false);

  const getRiwayat = async () => {
    if (!params.nip) {
      Alert.alert("Gagal", "NIP tidak ditemukan.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://app.rsabojonegoro.com:3000/att/report/nipperiode",
        {
          nip: params.nip,
          bDate: bDate,
          eDate: eDate,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      setDataAbsen(response.data?.response || []);
    } catch (error: any) {
      console.log("ERROR REPORT:", error?.response?.data || error.message);
      setDataAbsen([]);
      Alert.alert("Data Kosong", "Riwayat absensi tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getRiwayat();
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() =>
              router.replace({
                pathname: "/home",
                params: {
                  nip: params.nip,
                  nm: params.nm,
                  room: params.room,
                  foto: params.foto,
                },
              })
            }
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>Report Absensi</Text>
            <Text style={styles.headerSubtitle}>{params.nm || "-"}</Text>
          </View>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.inputLabel}>Tanggal Awal</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowBDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formatDisplayDate(bDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateCol}>
              <Text style={styles.inputLabel}>Tanggal Akhir</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formatDisplayDate(eDate)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showBDatePicker && (
            <DateTimePicker
              value={toDateObject(bDate)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={(event, selectedDate) => {
                setShowBDatePicker(false);
                if (selectedDate) {
                  setBDate(formatBackendDate(selectedDate));
                }
              }}
            />
          )}

          {showEDatePicker && (
            <DateTimePicker
              value={toDateObject(eDate)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={(event, selectedDate) => {
                setShowEDatePicker(false);
                if (selectedDate) {
                  setEDate(formatBackendDate(selectedDate));
                }
              }}
            />
          )}

          <TouchableOpacity style={styles.filterButton} onPress={getRiwayat}>
            <Text style={styles.filterButtonText}>Tampilkan Report</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1565C0"
            style={{ marginTop: 40 }}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.listContainer}>
            <View style={styles.tableHeader}>
              <Text style={styles.colTanggalHeader}>Tanggal</Text>
              <Text style={styles.colShiftHeader}>Shift</Text>
              <Text style={styles.colJamHeader}>Masuk</Text>
              <Text style={styles.colJamHeader}>Pulang</Text>
            </View>

            {dataAbsen.map((item, index) => (
              <View
                key={item.id}
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
            ))}
          </ScrollView>
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
    paddingTop: 48,
    paddingBottom: 30,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F5F7FB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterButton: {
    backgroundColor: "#1565C0",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  filterButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 22,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    elevation: 5,
  },
  summaryLabel: {
    color: "#777",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#222",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  totalText: {
    marginTop: 12,
    color: "#1565C0",
    fontSize: 15,
    fontWeight: "800",
  },
  listContainer: {
    padding: 22,
    paddingBottom: 40,
    paddingHorizontal: 22,
    overflow: "hidden",
    borderRadius: 16,
  },
  absenCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  dateText: {
    color: "#222",
    fontSize: 17,
    fontWeight: "800",
  },
  shiftBadge: {
    backgroundColor: "#E3F2FD",
    color: "#1565C0",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    fontWeight: "800",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  label: {
    color: "#777",
    fontSize: 14,
  },
  value: {
    color: "#222",
    fontSize: 14,
    fontWeight: "800",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },

  dateCol: {
    flex: 1,
  },

  dateButton: {
    backgroundColor: "#F5F7FB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  dateButtonText: {
    fontSize: 14,
    color: "#222",
    fontWeight: "800",
    textAlign: "center",
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

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,

    backgroundColor: "rgba(255,255,255,0.18)",

    justifyContent: "center",
    alignItems: "center",
  },
});
