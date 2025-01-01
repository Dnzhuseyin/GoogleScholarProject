using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MongoDB.Bson;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using OpenAI_API;
using System.Text;
using System.Linq;
using System.Globalization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDirectoryBrowser();
builder.Services.AddCors();
builder.Services.AddMemoryCache();

var app = builder.Build();

// MongoDB bağlantı dizesi ve veritabanı bilgileri
string connectionString = "mongodb+srv://erkantaha0303:3v5EuhsyA5CTxfIN@vtyscholar.y59ie.mongodb.net/?retryWrites=true&w=majority&appName=VTYScholar";
string databaseName = "SoftwareEngineering";

// MongoDB bağlantısını ve veritabanını statik olarak tut
var clientSettings = MongoClientSettings.FromConnectionString(connectionString);
clientSettings.ServerApi = new ServerApi(ServerApiVersion.V1);
clientSettings.MaxConnectionPoolSize = 1000;
var client = new MongoClient(clientSettings);
var database = client.GetDatabase(databaseName);

app.UseCors(builder => builder
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());

app.UseStaticFiles();
app.UseDefaultFiles();

// Cache servisini al
var cache = app.Services.GetRequiredService<IMemoryCache>();
const string CACHE_KEY = "academics_data";

// API endpoint'i
app.MapGet("/api/academics", async () =>
{
    try
    {
        // Önce cache'den veriyi kontrol et
        if (cache.TryGetValue(CACHE_KEY, out List<object> cachedData))
        {
            return Results.Ok(cachedData);
        }

        var collections = await database.ListCollectionNames().ToListAsync();
        var allAcademics = new List<object>();
        var tasks = new List<Task<List<BsonDocument>>>();

        // Tüm koleksiyonlardan paralel veri çekme
        foreach (var collectionName in collections)
        {
            var collection = database.GetCollection<BsonDocument>(collectionName);
            var task = collection.Find(new BsonDocument())
                               .ToListAsync();
            tasks.Add(task);
        }

        // Tüm sorguları paralel çalıştır
        var results = await Task.WhenAll(tasks);

        // Sonuçları işle
        for (int i = 0; i < results.Length; i++)
        {
            foreach (var doc in results[i])
            {
                var id = doc["_id"].AsObjectId.ToString();
                doc["_id"] = id;
                allAcademics.Add(doc.ToDictionary());
            }
        }

        if (allAcademics.Count == 0)
        {
            return Results.NotFound("Hiç akademisyen verisi bulunamadı.");
        }

        // Verileri cache'e kaydet (5 dakika süreyle)
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(5));
        cache.Set(CACHE_KEY, allAcademics, cacheOptions);

        return Results.Ok(allAcademics);
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Veritabanı Hatası",
            detail: ex.Message,
            statusCode: 500
        );
    }
});

// API endpoint'ini güncelle
app.MapGet("/api/academic/research-areas/{id}", async (string id) =>
{
    try
    {
        Console.WriteLine($"Requesting research areas for ID: {id}");

        if (string.IsNullOrEmpty(id))
        {
            return Results.BadRequest("Akademisyen ID'si geçersiz");
        }

        var collections = await database.ListCollectionNames().ToListAsync();
        Console.WriteLine($"Found {collections.Count} collections");

        BsonDocument academic = null;

        foreach (var collectionName in collections)
        {
            Console.WriteLine($"Searching in collection: {collectionName}");
            var collection = database.GetCollection<BsonDocument>(collectionName);
            
            try
            {
                var filter = Builders<BsonDocument>.Filter.Eq("_id", ObjectId.Parse(id));
                academic = await collection.Find(filter).FirstOrDefaultAsync();
                
                if (academic != null)
                {
                    Console.WriteLine($"Academic found in collection: {collectionName}");
                    break;
                }
            }
            catch (FormatException ex)
            {
                Console.WriteLine($"Invalid ObjectId format: {ex.Message}");
                return Results.BadRequest("Geçersiz akademisyen ID formatı");
            }
        }

        if (academic == null)
        {
            Console.WriteLine("Academic not found in any collection");
            return Results.NotFound("Akademisyen bulunamadı");
        }

        try
        {
            var articles = academic["makaleler"].AsBsonArray;
            var researchAreas = ResearchAreaAnalyzer.AnalyzeResearchAreas(articles);
            Console.WriteLine($"Research areas found: {researchAreas}");
            
            return Results.Ok(new { researchAreas = researchAreas });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error analyzing articles: {ex.Message}");
            return Results.Problem(
                title: "Makale Analiz Hatası",
                detail: "Makaleler analiz edilirken bir hata oluştu",
                statusCode: 500
            );
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        
        return Results.Problem(
            title: "Analiz Hatası",
            detail: ex.Message,
            statusCode: 500
        );
    }
});

app.Run();

// Sınıf tanımlaması program kodundan sonra geliyor
public static class ResearchAreaAnalyzer
{
    public static string AnalyzeResearchAreas(BsonArray articles)
    {
        var keywords = new Dictionary<string, int>
        {
            // Yapay Zeka ve Alt Alanları
            {"yapay zeka", 0},
            {"artificial intelligence", 0},
            {"ai", 0},
            {"makine öğrenmesi", 0},
            {"machine learning", 0},
            {"ml", 0},
            {"derin öğrenme", 0},
            {"deep learning", 0},
            {"neural network", 0},
            {"sinir ağları", 0},
            {"yapay sinir ağları", 0},
            {"lstm", 0},
            {"cnn", 0},
            {"rnn", 0},

            // Veri Bilimi ve Analizi
            {"veri madenciliği", 0},
            {"data mining", 0},
            {"büyük veri", 0},
            {"big data", 0},
            {"veri analizi", 0},
            {"data analysis", 0},
            {"veri bilimi", 0},
            {"data science", 0},
            {"istatistiksel analiz", 0},
            {"statistical analysis", 0},

            // Siber Güvenlik
            {"siber güvenlik", 0},
            {"cyber security", 0},
            {"bilgi güvenliği", 0},
            {"information security", 0},
            {"kriptografi", 0},
            {"cryptography", 0},
            {"blockchain", 0},
            {"malware", 0},
            {"saldırı tespit", 0},
            {"intrusion detection", 0},

            // Ağ ve İletişim
            {"bilgisayar ağları", 0},
            {"computer networks", 0},
            {"kablosuz ağlar", 0},
            {"wireless networks", 0},
            {"5g", 0},
            {"protokol", 0},
            {"protocol", 0},
            {"routing", 0},
            {"network security", 0},

            // Yazılım Geliştirme
            {"yazılım mühendisliği", 0},
            {"software engineering", 0},
            {"yazılım geliştirme", 0},
            {"software development", 0},
            {"yazılım testi", 0},
            {"software testing", 0},
            {"agile", 0},
            {"devops", 0},
            {"microservice", 0},
            {"web development", 0},
            {"mobile development", 0},

            // Görüntü ve Sinyal İşleme
            {"görüntü işleme", 0},
            {"image processing", 0},
            {"computer vision", 0},
            {"bilgisayarlı görü", 0},
            {"sinyal işleme", 0},
            {"signal processing", 0},
            {"pattern recognition", 0},
            {"örüntü tanıma", 0},

            // Doğal Dil İşleme
            {"doğal dil işleme", 0},
            {"natural language processing", 0},
            {"nlp", 0},
            {"metin madenciliği", 0},
            {"text mining", 0},
            {"sentiment analysis", 0},
            {"duygu analizi", 0},

            // Robotik ve Otomasyon
            {"robotik", 0},
            {"robotics", 0},
            {"otomasyon", 0},
            {"automation", 0},
            {"robot", 0},
            {"kontrol sistemleri", 0},
            {"control systems", 0},

            // Bulut Bilişim ve IoT
            {"bulut bilişim", 0},
            {"cloud computing", 0},
            {"nesnelerin interneti", 0},
            {"internet of things", 0},
            {"iot", 0},
            {"edge computing", 0},
            {"fog computing", 0},
            {"aws", 0},
            {"azure", 0},

            // Mobil ve Gömülü Sistemler
            {"mobil", 0},
            {"mobile", 0},
            {"android", 0},
            {"ios", 0},
            {"gömülü sistemler", 0},
            {"embedded systems", 0},
            {"real-time systems", 0},

            // Veritabanı Sistemleri
            {"veritabanı", 0},
            {"database", 0},
            {"sql", 0},
            {"nosql", 0},
            {"veri tabanı", 0},
            {"data warehouse", 0},
            {"veri ambarı", 0},

            // Optimizasyon ve Algoritma
            {"optimizasyon", 0},
            {"optimization", 0},
            {"algoritma", 0},
            {"algorithm", 0},
            {"complexity", 0},
            {"karmaşıklık", 0},

            // Multimedya ve Oyun
            {"multimedya", 0},
            {"multimedia", 0},
            {"oyun", 0},
            {"game", 0},
            {"sanal gerçeklik", 0},
            {"virtual reality", 0},
            {"artırılmış gerçeklik", 0},
            {"augmented reality", 0}
        };

        if (articles == null || articles.Count == 0)
        {
            return "Makale bilgisi bulunamadı";
        }

        foreach (var article in articles)
        {
            try
            {
                // Başlık ve yayın yeri bilgilerini birleştirerek analiz et
                string title = article["baslik"].AsString.ToLower();
                string venue = article["yayin_yeri"]?.AsString?.ToLower() ?? "";
                string combinedText = $"{title} {venue}";

                foreach (var keyword in keywords.Keys.ToList())
                {
                    if (combinedText.Contains(keyword))
                    {
                        keywords[keyword]++;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Makale analiz edilirken hata: {ex.Message}");
                continue;
            }
        }

        // En çok geçen 5 alanı seç
        var topAreas = keywords
            .Where(k => k.Value > 0)
            .OrderByDescending(k => k.Value)
            .Take(5)
            .Select(k => k.Key)
            .ToList();

        // Sonuçları Türkçeleştir ve düzenle
        var translatedAreas = topAreas.Select(area => TranslateAndFormat(area)).Distinct();

        return translatedAreas.Any() 
            ? string.Join(", ", translatedAreas) 
            : "Belirli bir araştırma alanı tespit edilemedi";
    }

    private static string TranslateAndFormat(string area)
    {
        // İngilizce terimleri Türkçe karşılıklarıyla değiştir
        var translations = new Dictionary<string, string>
        {
            {"artificial intelligence", "Yapay Zeka"},
            {"machine learning", "Makine Öğrenmesi"},
            {"deep learning", "Derin Öğrenme"},
            {"data mining", "Veri Madenciliği"},
            {"cyber security", "Siber Güvenlik"},
            {"computer networks", "Bilgisayar Ağları"},
            {"software engineering", "Yazılım Mühendisliği"},
            {"image processing", "Görüntü İşleme"},
            {"natural language processing", "Doğal Dil İşleme"},
            {"robotics", "Robotik"},
            {"big data", "Büyük Veri"},
            {"cloud computing", "Bulut Bilişim"},
            {"internet of things", "Nesnelerin İnterneti"}
            // Diğer çeviriler eklenebilir
        };

        // İlk harfi büyük yap ve varsa çevirisini kullan
        area = area.ToLower();
        if (translations.ContainsKey(area))
            return translations[area];
        
        return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(area);
    }
}
