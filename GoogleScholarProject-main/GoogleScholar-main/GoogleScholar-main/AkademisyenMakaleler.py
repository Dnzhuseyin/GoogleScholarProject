import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient
import time
import os

def makale_verileri():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    # Akademisyenlerin google akademik kimlikleri
    akademisyen_kimlikleri = ["_RKTpkMAAAAJ", "KIsNWY4AAAAJ", "HD2HihcAAAAJ", "YfDMrjoAAAAJ", 
                              "oqAqSxsAAAAJ", "xzef-AYAAAAJ", "lGTBW8AAAAAJ", "ekzy6EUAAAAJ", 
                              "slUA7yUAAAAJ", "HV4FNxsAAAAJ", "IWlhm-cAAAAJ", "zEd9GiEAAAAJ"]

    # MongoDB bağlantısı - Environment variable'dan al
    connection_string = os.getenv('MONGODB_URI', "mongodb+srv://erkantaha0303:3v5EuhsyA5CTxfIN@vtyscholar.y59ie.mongodb.net")
    sunucu = MongoClient(connection_string)
    vt = sunucu["SoftwareEngineering"]

    for user_id in akademisyen_kimlikleri:
        url = f"https://scholar.google.com/citations?user={user_id}&hl=tr"
        response = requests.get(url, headers=headers)
        
        time.sleep(3)  # Google Scholar rate limiting'i önlemek için bekleme

        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Akademisyen adını al
            isim = soup.find(id="gsc_prf_inw").get_text()
            
            # Makaleleri çek
            makale_container = soup.find_all("tr", class_="gsc_a_tr")
            makaleler = []
            
            # İlk 10 makaleyi al (eğer 10'dan az makale varsa hepsini al)
            for i, makale in enumerate(makale_container[:10]):
                baslik = makale.find("a", class_="gsc_a_at")
                yazarlar = makale.find("div", class_="gs_gray")
                yayin = makale.find_all("div", class_="gs_gray")[1]
                yil = makale.find("span", class_="gsc_a_h")
                atif = makale.find("a", class_="gsc_a_ac")

                makale_bilgisi = {
                    "sira": i + 1,
                    "baslik": baslik.get_text() if baslik else "Belirtilmemiş",
                    "yazarlar": yazarlar.get_text() if yazarlar else "Belirtilmemiş",
                    "yayin_yeri": yayin.get_text() if yayin else "Belirtilmemiş",
                    "yil": yil.get_text() if yil.get_text() else "Belirtilmemiş",
                    "atif_sayisi": atif.get_text() if atif and atif.get_text() else "0"
                }
                makaleler.append(makale_bilgisi)

            # Veritabanı işlemleri
            koleksiyon = vt[isim]

            # Mevcut akademisyen dokümanını güncelle
            koleksiyon.update_one(
                {"Ad_Soyad": isim},
                {
                    "$set": {
                        "makaleler": makaleler,
                        "makale_guncelleme_tarihi": time.strftime("%Y-%m-%d %H:%M:%S")
                    }
                }
            )

            print(f"{isim} için ilk 10 makale başarıyla güncellendi.")
        else:
            print(f"{user_id} kullanıcısı için veriler çekilemedi, durum kodu: {response.status_code}")

    print("Tüm akademisyenlerin makaleleri başarıyla güncellendi.")

if __name__ == "__main__":
    makale_verileri()
