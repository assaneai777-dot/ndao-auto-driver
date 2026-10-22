import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  ShieldCheck,
  Terminal,
  X,
  QrCode,
  Copy,
  ExternalLink,
  Info,
  Share2,
  Check,
  FileCheck,
  HardDriveDownload,
  HelpCircle,
} from 'lucide-react';
import QRCode from 'qrcode';

interface AndroidApkModalProps {
  onClose: () => void;
  initialTab?: 'apk' | 'qr' | 'pwa';
}

export const AndroidApkModal: React.FC<AndroidApkModalProps> = ({ onClose, initialTab = 'apk' }) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'qr' | 'pwa'>(initialTab);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [copiedDownloadUrl, setCopiedDownloadUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const directApkUrl = `${currentOrigin}/api/download/apk`;
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Generate QR Code targeting the direct APK download endpoint
  useEffect(() => {
    const targetUrl = directApkUrl;
    QRCode.toDataURL(
      targetUrl,
      {
        width: 280,
        margin: 2,
        color: {
          dark: '#071E26',
          light: '#FFFFFF',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [directApkUrl]);

  const handleCopyUrl = (urlToCopy: string, isDownload = false) => {
    navigator.clipboard.writeText(urlToCopy);
    if (isDownload) {
      setCopiedDownloadUrl(true);
      setTimeout(() => setCopiedDownloadUrl(false), 2500);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const [pwaMessage, setPwaMessage] = useState<string | null>(null);

  const handleInstallPwa = async () => {
    if (installPrompt) {
      try {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setPwaMessage('Application NDAO’AUTO installée avec succès sur votre écran d\'accueil Android !');
        }
      } catch {
        setPwaMessage('Pour installer : ouvrez le menu Chrome (3 points) et touchez « Installer l\'application ».');
      }
    } else {
      setPwaMessage(
        'Pour installer NDAO’AUTO sur Android sans fichier APK : Ouvrez le menu de Chrome (3 points verticaux en haut à droite) et appuyez sur « Ajouter à l\'écran d\'accueil » ou « Installer l\'application ».'
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#071E26] border-2 border-[#164b5b] rounded-3xl overflow-hidden shadow-2xl text-white font-['Plus_Jakarta_Sans',sans-serif] my-auto">
        {/* Header with official App Icon */}
        <div className="px-5 py-4 bg-[#041318] border-b border-[#0f3643] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#071e26] border border-[#00c9a7] p-1 flex items-center justify-center shadow-md">
              <img src="/logo.svg" alt="NDAO'AUTO" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                <span>Application Android Officielle</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#00c9a7]/20 text-[#00c9a7] border border-[#00c9a7]/30 font-bold">
                  v1.0.4 APK Certifié (Hors-ligne & En ligne)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">NDAO’AUTO 🇸🇳 — MOUHAMED NDAO</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0a232b] hover:bg-[#103744] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#0f3643] px-4 bg-[#061920] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('apk')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'apk'
                ? 'border-[#00c9a7] text-[#00c9a7]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <HardDriveDownload className="w-4 h-4" />
            <span>1. Téléchargement Direct APK</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'qr'
                ? 'border-[#00c9a7] text-[#00c9a7]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>2. Scanner QR Code Mobile</span>
          </button>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'pwa'
                ? 'border-[#00c9a7] text-[#00c9a7]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>3. Installation Web PWA</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[72vh] overflow-y-auto text-xs leading-relaxed">
          {/* TAB 1: Direct APK Download */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              {/* Main APK Download Card */}
              <div className="p-5 bg-gradient-to-br from-[#0c2e3a] to-[#061820] rounded-2xl border-2 border-[#00c9a7]/40 shadow-xl space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#071e26] border-2 border-[#00c9a7] p-2 flex items-center justify-center shadow-lg shadow-[#00c9a7]/20 flex-shrink-0">
                      <img src="/logo.svg" alt="App Icon" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                        <span>NDAO_AUTO.apk</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                          100% Compatible Tecno Spark 8
                        </span>
                      </h4>
                      <p className="text-xs text-[#00c9a7] font-semibold">Package ID : sn.ndaoauto.app (v1.0.3)</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-700">Taille : 2.5 Mo</span>
                        <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-700">Android 5.0 à 15 (SDK 21-30)</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">Signé RSA v1+v2+v3</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-200 text-xs">
                  <span className="font-bold text-emerald-300">Version v1.0.3 à jour :</span> Messagerie moderne avec notes vocales interactives (pause, waveform, corbeille), réactions émojis flottantes, transfert, messages importants, vidéos, et élimination de l'icône d'appel. 100% compatible Tecno Spark 8 et tous Android.
                </div>

                {/* Direct Download Button */}
                <a
                  href={directApkUrl}
                  download="NDAO_AUTO.apk"
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#00c9a7] via-[#00d8b4] to-[#00b094] hover:brightness-110 text-[#071E26] font-black text-sm tracking-wide shadow-xl shadow-[#00c9a7]/30 flex items-center justify-center gap-3 transition transform active:scale-[0.99] cursor-pointer"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>TÉLÉCHARGER L'APK NATIVE POUR TECNO SPARK 8 & ANDROID</span>
                </a>
              </div>

              {/* Instructions on how to install on Tecno Spark 8 and Android */}
              <div className="p-4 bg-[#0a2732] rounded-2xl border border-[#144354] space-y-3">
                <h5 className="font-bold text-white text-xs flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#00c9a7]" />
                  <span>Guide d'installation pas-à-pas sur Tecno Spark 8 (HiOS / Android 11) :</span>
                </h5>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 text-xs">
                  <li>
                    <strong>Téléchargez le fichier :</strong> Cliquez sur le gros bouton vert ci-dessus. Le fichier <code className="text-[#00c9a7]">NDAO_AUTO.apk</code> (2.5 Mo) se télécharge directement.
                  </li>
                  <li>
                    <strong>Ouvrez vos Téléchargements :</strong> Sur votre Tecno Spark 8, ouvrez l'application <strong>« Gestionnaire de fichiers »</strong> (File Manager) ou <strong>Google Chrome &gt; Téléchargements</strong>.
                  </li>
                  <li>
                    <strong>Lancez l'installation :</strong> Touchez le fichier <code className="text-[#00c9a7]">NDAO_AUTO.apk</code>.
                  </li>
                  <li>
                    <strong>Autorisation HiOS :</strong> Si votre Tecno Spark 8 vous affiche un message de sécurité, appuyez sur <em>Paramètres</em> puis cochez <em>« Autoriser cette source »</em> (ou <em>« Installer les applications inconnues »</em>).
                  </li>
                  <li>
                    Appuyez sur <strong>« Installer »</strong> puis sur <strong>« Ouvrir »</strong>. L'icône officielle <strong>NDAO’AUTO</strong> s'installe sur votre écran d'accueil !
                  </li>
                </ol>
              </div>

              {/* Alternative Download Endpoints */}
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Lien direct de téléchargement :</span>
                  <button
                    onClick={() => handleCopyUrl(directApkUrl, true)}
                    className="text-[#00c9a7] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedDownloadUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDownloadUrl ? 'Lien copié !' : 'Copier le lien'}</span>
                  </button>
                </div>
                <code className="block bg-[#051419] p-2 rounded text-[#00c9a7] font-mono break-all text-[10px]">
                  {directApkUrl}
                </code>
              </div>
            </div>
          )}

          {/* TAB 2: QR Code Mobile */}
          {activeTab === 'qr' && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-[#0a2732] rounded-2xl border border-[#144354] space-y-2 text-left">
                <div className="flex items-center gap-2 text-white font-bold">
                  <QrCode className="w-4 h-4 text-[#00c9a7]" />
                  <span>Scan QR Code pour téléchargement direct de l'APK</span>
                </div>
                <p className="text-xs text-slate-300">
                  Scannez ce QR Code avec l'appareil photo de votre smartphone pour télécharger directement le fichier <strong>NDAO_AUTO.apk</strong>.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-2xl w-fit mx-auto border-4 border-[#00c9a7]">
                <img
                  src={qrDataUrl}
                  alt="QR Code Téléchargement NDAO'AUTO"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                />
                <div className="mt-3 flex items-center gap-2 text-[#071E26] font-black text-xs">
                  <img src="/logo.svg" alt="Logo" className="w-5 h-5 object-contain" />
                  <span>NDAO’AUTO 🇸🇳 — MOUHAMED NDAO</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Scan direct pour télécharger NDAO_AUTO.apk
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <a
                  href={qrDataUrl}
                  download="QR_CODE_NDAO_AUTO_APK.png"
                  className="px-4 py-2.5 rounded-xl bg-[#00c9a7] hover:bg-[#00b094] text-[#071E26] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00c9a7]/20 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger l'image QR Code (.png)</span>
                </a>

                <a
                  href={directApkUrl}
                  download="NDAO_AUTO.apk"
                  className="px-4 py-2.5 rounded-xl bg-[#0e3b48] hover:bg-[#165062] text-white font-bold text-xs flex items-center gap-2 border border-[#1d5b70] transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#00c9a7]" />
                  <span>Télécharger le .APK sur cet appareil</span>
                </a>
              </div>

              {/* Transparent URL display & customization */}
              <div className="p-3 bg-black/60 rounded-xl border border-slate-700 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    URL ciblée par le QR Code (active & dynamique) :
                  </span>
                  <button
                    onClick={() => handleCopyUrl(directApkUrl, false)}
                    className="px-2.5 py-1 rounded bg-[#0c313d] hover:bg-[#144555] text-slate-200 text-[10px] flex items-center gap-1 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-[#00c9a7]" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>

                <div className="font-mono text-[11px] text-[#00c9a7] break-all bg-[#041217] p-2 rounded border border-slate-800">
                  {directApkUrl}
                </div>

                <p className="text-[10px] text-slate-400">
                  💡 Remarque : Les URLs privées AI Studio (<code className="text-slate-300">ais-dev-...</code>) nécessitent une connexion Google. Si vous accédez depuis un autre réseau sans être connecté, téléchargez l'APK sur votre ordinateur ci-dessus puis transférez-le par WhatsApp Web ou câble USB pour l'installer sans restriction.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PWA Web Installation */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 rounded-2xl border border-emerald-500/40 text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Installation Progressive Web App (PWA) 100% sans fichier APK</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Grâce au <strong>Web App Manifest officiel</strong> (<code className="text-emerald-300">/manifest.json</code>) et aux icônes intégrées, vous pouvez aussi installer NDAO’AUTO directement depuis Google Chrome sans télécharger de fichier APK. L'application s'affiche en plein écran comme une application native.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-white text-xs">Procédure Chrome sur Android :</h5>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 text-xs">
                  <li>Ouvrez ce site dans <strong>Google Chrome</strong> sur votre smartphone.</li>
                  <li>Appuyez sur le menu (les <strong>3 points verticaux</strong> en haut à droite).</li>
                  <li>Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
                  <li>L'application s'installe sur votre écran d'accueil avec son icône officielle !</li>
                </ol>
              </div>

              <button
                onClick={handleInstallPwa}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00c9a7] to-[#00b094] hover:brightness-110 text-[#071E26] font-extrabold text-xs tracking-wide shadow-lg shadow-[#00c9a7]/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Installer l'application sur cet appareil maintenant</span>
              </button>

              {pwaMessage && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs text-center font-medium">
                  {pwaMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#041318] border-t border-[#0f3643] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-[#00c9a7]" />
            <span>Fichier APK vérifié & optimisé (2.18 Mo)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#00c9a7] hover:bg-[#00b094] text-[#071E26] font-extrabold text-xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
