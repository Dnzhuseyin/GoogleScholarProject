using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class Article
{
    public int sira { get; set; }
    public string? baslik { get; set; }
    public string? yazarlar { get; set; }
    public string? yayin_yeri { get; set; }
    public string? yil { get; set; }
    public string? atif_sayisi { get; set; }
}

public class Academic
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }
    
    public string? Ad_Soyad { get; set; }
    public string? Atif { get; set; }
    public string? h_indeks { get; set; }
    public string? i10_indeks { get; set; }
    public string? makale_guncelleme_tarihi { get; set; }
    public List<Article>? makaleler { get; set; }

    public Academic()
    {
        makaleler = new List<Article>();
    }
} 