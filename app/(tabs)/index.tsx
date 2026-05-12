import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  useEffect(() => {
    const cekLogin = async () => {
      const data = await AsyncStorage.getItem("karyawan");

      if (data) {
        const karyawan = JSON.parse(data);

        router.replace({
          pathname: "/home",
          params: {
            nip: karyawan.nip,
            nm: karyawan.nm,
            room: karyawan.room,
            foto: karyawan.foto,
          },
        });
      } else {
        router.replace("/login");
      }
    };

    cekLogin();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#1565C0" />
    </View>
  );
}
