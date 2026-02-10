import React from "react";

export default function KvkkModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="font-bold text-blue-900">KVKK Aydınlatma Metni</div>
          <button onClick={onClose} className="px-3 py-1 rounded-lg bg-white border hover:bg-slate-100">
            Kapat
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto text-sm text-slate-700 space-y-4 leading-relaxed">
          <p className="font-semibold">Değerli Veli/Vasi,</p>

          <p>
            Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında,
            23 Nisan temalı yarışma başvurusu sürecinde işlenen kişisel verilere ilişkin olarak
            bilgilendirme amacıyla hazırlanmıştır.
          </p>

          <p className="font-semibold">1) Veri Sorumlusu</p>
          <p>
            Veri sorumlusu: <strong>Batıkent İngiliz Kültür Koleji</strong>.
            (Kurumun tam unvanı/adresi ve KVKK başvuru kanalı ayrıca eklenmelidir.)
          </p>

          <p className="font-semibold">2) İşlenen Kişisel Veriler</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Öğrenci adı-soyadı, sınıf seviyesi, mevcut okul bilgisi</li>
            <li>Veli telefon numarası</li>
            <li>Yüklenen eser dosyası/görseli ve başvuru kayıt bilgileri (tarih, doğrulama kodu)</li>
            <li>İşlem güvenliği kayıtları (sınırlı loglar)</li>
          </ul>

          <p className="font-semibold">3) İşleme Amaçları</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Başvuruların alınması ve yarışma sürecinin yürütülmesi</li>
            <li>Jüri değerlendirmesi ve sonuçların hazırlanması</li>
            <li>Katılım sertifikası oluşturulması ve bilgilendirme yapılması</li>
            <li>Hukuki yükümlülüklerin yerine getirilmesi ve bilgi güvenliği</li>
          </ul>

          <p className="font-semibold">4) Hukuki Sebep</p>
          <p>
            Kişisel veriler; KVKK md.5/2 kapsamında sözleşmenin kurulması/ifası, hukuki yükümlülük ve meşru menfaat
            hukuki sebeplerine dayanılarak işlenebilir. Tanıtım/iletişim izni (opsiyonel) ayrıca alınır.
          </p>

          <p className="font-semibold">5) Aktarım</p>
          <p>
            Veriler; hizmetin yürütülmesi için zorunlu olduğu ölçüde bilişim altyapısı/hizmet sağlayıcılarına
            ve yasal zorunluluk halinde yetkili kurumlara aktarılabilir.
          </p>

          <p className="font-semibold">6) Saklama Süresi</p>
          <p>
            Veriler, yarışma süresi ve olası itiraz/denetim süreçleri ile mevzuattan doğan zorunlu süreler boyunca saklanır;
            süre sonunda silme/yok etme/anonimleştirme yapılır.
          </p>

          <p className="font-semibold">7) Haklarınız</p>
          <p>
            KVKK md.11 kapsamındaki haklarınızı kullanmak için kurumun KVKK iletişim kanalları üzerinden başvurabilirsiniz.
          </p>

          <p className="text-xs text-slate-500">
            Not: Bu metin genel şablondur. Kurumun tam unvanı, adresi ve KVKK başvuru kanalı mutlaka eklenmelidir.
          </p>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <button onClick={onClose} className="bg-blue-900 text-white px-5 py-2 rounded-xl hover:bg-blue-800">
            Okudum
          </button>
        </div>
      </div>
    </div>
  );
}
