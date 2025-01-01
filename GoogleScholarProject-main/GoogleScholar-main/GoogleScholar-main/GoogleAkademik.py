import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient
import time
import os

def akademisyen_verileri():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    # Akademisyenlerin google akademik kimlikleri.
    akademisyen_kimlikleri = ["_RKTpkMAAAAJ", "KIsNWY4AAAAJ", "HD2HihcAAAAJ", "YfDMrjoAAAAJ", 
                              "oqAqSxsAAAAJ", "xzef-AYAAAAJ", "lGTBW8AAAAAJ", "ekzy6EUAAAAJ", 
                              "slUA7yUAAAAJ", "HV4FNxsAAAAJ", "IWlhm-cAAAAJ", "zEd9GiEAAAAJ"]

    # MongoDB bağlantısı - Environment variable'dan al
    connection_string = os.getenv('MONGODB_URI', "mongodb+srv://erkantaha0303:3v5EuhsyA5CTxfIN@vtyscholar.y59ie.mongodb.net/")
    sunucu = MongoClient(connection_string)
    vt = sunucu["SoftwareEngineering"]

    for user_id in akademisyen_kimlikleri:
        url = f"https://scholar.google.com/citations?user={user_id}&hl=tr"
        response = requests.get(url, headers=headers)
        
        time.sleep(3)  

        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')

            # Akademisyen bilgilerini google akademik üzerinden çekme.
            isim = soup.find(id="gsc_prf_inw")
            atif = soup.find_all(class_="gsc_rsb_std")[0]
            h_indeks = soup.find_all(class_="gsc_rsb_std")[2]
            i10_indeks = soup.find_all(class_="gsc_rsb_std")[4]

            # Akademisyen verileri
            akademisyenveri = {
                "Ad_Soyad": isim.get_text(),
                "Atif": atif.get_text(),
                "h_indeks": h_indeks.get_text(),
                "i10_indeks": i10_indeks.get_text()
            }

            # Veri tabanı işlemleri.
            koleksiyon_adi = isim.get_text()
            koleksiyon = vt[koleksiyon_adi]

            # Veritabanındaki verileri güncelleme.
            koleksiyon.update_one(
                {"Ad_Soyad": isim.get_text()},
                {"$set": akademisyenveri},
                upsert=True
            )

            print(f"{koleksiyon_adi} koleksiyonundaki akademisyen bilgisi başarıyla güncellendi veya eklendi.")
        else:
            print(f"{user_id} kullanıcısı için veriler çekilemedi, durum kodu: {response.status_code}")

    print("Tüm akademisyenler başarıyla güncellendi.")


if __name__ == "__main__":
    akademisyen_verileri()
