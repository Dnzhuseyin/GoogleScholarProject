import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup
import time
import re

# Firebase ayarları
cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Tüm hocaların Google Scholar URL'lerini tutan liste
hocanin_url_dizisi = [
    "https://scholar.google.com/citations?hl=tr&user=KIsNWY4AAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=HD2HihcAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=xzef-AYAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=oqAqSxsAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=YfDMrjoAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=lGTBW8AAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=_RKTpkMAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=ekzy6EUAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=slUA7yUAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=IWlhm-cAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=HV4FNxsAAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=MAlfGD8AAAAJ",
    "https://scholar.google.com/citations?hl=tr&user=zEd9GiEAAAAJ"
    # Diğer hocaların URL'lerini buraya ekleyin
]

# Google Scholar'dan verileri çekme işlevi
def veri_cek_ve_yukle(url):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    akademisyen = requests.get(url, headers=headers)
    time.sleep(3)
    soup = BeautifulSoup(akademisyen.content, 'html.parser')

    # Akademisyen bilgilerini çekme
    baslik = soup.find(id="gsc_prf_inw").get_text()
    yeni_atif = soup.find_all(class_="gsc_rsb_std")[0].get_text()
    yeni_h_indeks = soup.find_all(class_="gsc_rsb_std")[2].get_text()
    yeni_i10_indeks = soup.find_all(class_="gsc_rsb_std")[4].get_text()

    # Makale sayısını bulma
    makale_sayisi_text = soup.find("span", id="gsc_a_nn").get_text()
    makale_sayisi = int(re.search(r'\d+$', makale_sayisi_text).group()) if makale_sayisi_text else 0

    # Firebase Firestore'a akademisyen bilgilerini ekleme veya güncelleme
    doc_ref = db.collection("Universiteler").document("Firat Universitesi").collection("Yazilim Mühendisligi").document(baslik)
    existing_data = doc_ref.get()

    if existing_data.exists:
        # Mevcut Firestore verilerini al
        mevcut_veri = existing_data.to_dict()
        mevcut_atif = mevcut_veri.get("alinti_sayisi")
        mevcut_h_indeks = mevcut_veri.get("h_endeksi")
        mevcut_i10_indeks = mevcut_veri.get("i10_endeksi")

        # Verilerde değişiklik kontrolü
        if (mevcut_atif != yeni_atif) or (mevcut_h_indeks != yeni_h_indeks) or (mevcut_i10_indeks != yeni_i10_indeks):
            # Tüm bilgileri yeniden kaydederek eski verilerin üstüne yazar
            doc_ref.set({
                "isim":baslik,
                "alinti_sayisi": yeni_atif,
                "h_endeksi": yeni_h_indeks,
                "i10_endeksi": yeni_i10_indeks,
            })
            print(f"Veriler güncellendi: {baslik}")
        else:
            print(f"Veriler zaten güncel: {baslik}")
    else:
        # Eğer belge daha önce eklenmediyse, tüm bilgileri kaydet
        doc_ref.set({
            "isim":baslik,
            "alinti_sayisi": yeni_atif,
            "h_endeksi": yeni_h_indeks,
            "i10_endeksi": yeni_i10_indeks,
        })
        print(f"Yeni akademisyen eklendi: {baslik} - {makale_sayisi} makale")

    # Makaleleri döngüyle ekleme
    for i in range(makale_sayisi):  # Dinamik olarak belirlenen makale sayısına göre döngü
        makale_ismi = soup.find_all(class_="gsc_a_at")[i].get_text()
        makale_ref = db.collection("Akademisyenler").document(baslik).collection("Makaleler").document(f"Makale-{i+1}")
        makale_ref.set({
            "makale-ismi": makale_ismi
        })

# Tüm hocaların verilerini tek bir çalıştırmada yükleme
for url in hocanin_url_dizisi:
    veri_cek_ve_yukle(url)
