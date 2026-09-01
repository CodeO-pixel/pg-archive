'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  BookOpen, Upload, Plus, ChevronLeft, ChevronRight, 
  LogOut, Shield 
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Series {
  id: string;
  title: string;
  cover_url: string;
  description: string;
}

interface Chapter {
  id: string;
  series_id: string;
  number: number;
  title: string;
  pages: string[];
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('Lector');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(-1);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [newSeriesDesc, setNewSeriesDesc] = useState('');
  const [newSeriesCover, setNewSeriesCover] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterFiles, setChapterFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserRole(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserRole(session.user.id);
    });

    fetchSeries();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data?.role) setRole(data.role);
  };

  const fetchSeries = async () => {
    const { data } = await supabase.from('series').select('*').order('created_at', { ascending: false });
    if (data) setSeriesList(data);
  };

  const fetchChapters = async (seriesId: string) => {
    const { data } = await supabase.from('chapters').select('*').eq('series_id', seriesId).order('number', { ascending: true });
    if (data) setChapters(data);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else alert('¡Cuenta creada! Ya puedes iniciar sesión.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
  };

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeriesTitle) return;
    const { error } = await supabase.from('series').insert([{
      title: newSeriesTitle,
      description: newSeriesDesc,
      cover_url: newSeriesCover || 'https://via.placeholder.com/300x400?text=Sin+Portada'
    }]);
    if (!error) {
      setNewSeriesTitle('');
      setNewSeriesDesc('');
      setNewSeriesCover('');
      fetchSeries();
    }
  };

  const handleUploadChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeries || !chapterFiles || chapterFiles.length === 0) return;
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < chapterFiles.length; i++) {
        const file = chapterFiles[i];
        const fileExt = file.name.split('.').pop();
        const filePath = `${selectedSeries.id}/cap_${chapterNumber}/${Date.now()}_${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('manga-pages').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('manga-pages').getPublicUrl(filePath);
        uploadedUrls.push(publicUrlData.publicUrl);
      }

      await supabase.from('chapters').insert([{
        series_id: selectedSeries.id,
        number: chapterNumber,
        title: chapterTitle || `Capítulo ${chapterNumber}`,
        pages: uploadedUrls
      }]);

      setChapterTitle('');
      setChapterFiles(null);
      fetchChapters(selectedSeries.id);
    } catch (err: any) {
      alert('Error al subir capítulo: ' + err.message);
    } fontally {
      setUploading(false);
    }
  };

  const openSeries = (s: Series) => {
    setSelectedSeries(s);
    fetchChapters(s.id);
    setCurrentChapterIndex(-1);
  };

  const currentChapter = currentChapterIndex >= 0 ? chapters[currentChapterIndex] : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedSeries(null); setCurrentChapterIndex(-1); }}>
          <BookOpen className="w-6 h-6 text-indigo-500" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            PG-Archive
          </h1>
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                <Shield className="w-3 h-3" /> {role}
              </span>
              <span className="text-sm text-gray-400 hidden sm:inline">{user.email}</span>
              <button onClick={() => supabase.auth.signOut()} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Acceso Invitado</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {!user && (
          <div className="max-w-md mx-auto my-8 p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-center">{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
            {authError && <p className="text-red-400 text-sm mb-4 bg-red-950/50 p-2 rounded border border-red-900">{authError}</p>}
            <form onSubmit={handleAuth} className="space-y-4">
              <input 
                type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <input 
                type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 font-medium py-2 rounded-lg text-sm transition">
                {isSignUp ? 'Registrarse' : 'Entrar'}
              </button>
            </form>
            <p className="text-xs text-center text-gray-400 mt-4 cursor-pointer hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </p>
          </div>
        )}

        {/* NAVEGADOR / LECTOR DE CAPÍTULOS */}
        {currentChapter ? (
          <div className="space-y-4">
            <button 
              onClick={() => setCurrentChapterIndex(-1)} 
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-2"
            >
              <ChevronLeft className="w-4 h-4" /> Volver a lista de capítulos
            </button>

            {/* CONTROLES: CAPÍTULOS Y DESPLEGABLE DE PÁGINA */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentChapterIndex((prev) => Math.max(0, prev - 1));
                    setCurrentPageIndex(0);
                  }}
                  disabled={currentChapterIndex <= 0}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center gap-1 transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Cap. Anterior
                </button>

                <span className="text-sm font-semibold text-gray-300 px-2">
                  Cap. {currentChapter.number}
                </span>

                <button
                  onClick={() => {
                    setCurrentChapterIndex((prev) => Math.min(chapters.length - 1, prev + 1));
                    setCurrentPageIndex(0);
                  }}
                  disabled={currentChapterIndex >= chapters.length - 1}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center gap-1 transition"
                >
                  Cap. Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Selector directo de página */}
              <div className="flex items-center gap-3">
                <label htmlFor="page-select" className="text-sm text-gray-400">
                  Ir a página:
                </label>
                <select
                  id="page-select"
                  value={currentPageIndex}
                  onChange={(e) => setCurrentPageIndex(Number(e.target.value))}
                  className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {currentChapter.pages.map((_, index) => (
                    <option key={index} value={index}>
                      Página {index + 1} de {currentChapter.pages.length}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* VISOR DE IMÁGENES */}
            <div className="relative flex flex-col items-center bg-gray-900 rounded-xl p-2 border border-gray-800">
              {currentChapter.pages.length > 0 ? (
                <div className="relative group max-w-3xl w-full flex justify-center">
                  <img 
                    src={currentChapter.pages[currentPageIndex]} 
                    alt={`Página ${currentPageIndex + 1}`}
                    className="max-h-[85vh] object-contain rounded shadow-2xl"
                  />
                  
                  <button 
                    onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentPageIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full opacity-75 hover:opacity-100 disabled:opacity-20 transition"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setCurrentPageIndex((prev) => Math.min(currentChapter.pages.length - 1, prev + 1))}
                    disabled={currentPageIndex === currentChapter.pages.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full opacity-75 hover:opacity-100 disabled:opacity-20 transition"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="p-8 text-gray-400">Este capítulo no contiene páginas.</div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Página {currentPageIndex + 1} de {currentChapter.pages.length}
              </p>
            </div>
          </div>

        ) : selectedSeries ? (
          <div className="space-y-6">
            <button onClick={() => setSelectedSeries(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
              <ChevronLeft className="w-4 h-4" /> Volver al catálogo
            </button>

            <div className="flex flex-col md:flex-row gap-6 bg-gray-900 p-6 rounded-xl border border-gray-800">
              <img src={selectedSeries.cover_url} alt={selectedSeries.title} className="w-48 h-64 object-cover rounded-lg shadow-md mx-auto md:mx-0" />
              <div className="flex-1 space-y-3">
                <h2 className="text-2xl font-bold text-white">{selectedSeries.title}</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{selectedSeries.description || 'Sin descripción disponible.'}</p>
              </div>
            </div>

            {(role === 'Admin' || role === 'Scan') && (
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-3">
                <h3 className="text-md font-semibold flex items-center gap-2 text-indigo-400">
                  <Upload className="w-4 h-4" /> Subir nuevo capítulo
                </h3>
                <form onSubmit={handleUploadChapter} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    type="number" placeholder="Núm. Capítulo" value={chapterNumber} onChange={e => setChapterNumber(Number(e.target.value))} required
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <input 
                    type="text" placeholder="Título opcional" value={chapterTitle} onChange={e => setChapterTitle(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <input 
                    type="file" multiple accept="image/*" onChange={e => setChapterFiles(e.target.files)} required
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-600 file:text-white"
                  />
                  <button 
                    type="submit" disabled={uploading}
                    className="md:col-span-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2 rounded-lg font-medium text-sm transition"
                  >
                    {uploading ? 'Subiendo páginas...' : 'Publicar Capítulo'}
                  </button>
                </form>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold mb-3">Capítulos Disponibles</h3>
              {chapters.length === 0 ? (
                <p className="text-sm text-gray-500">Aún no se han publicado capítulos para esta serie.</p>
              ) : (
                <div className="grid gap-2">
                  {chapters.map((chap, idx) => (
                    <div 
                      key={chap.id} 
                      onClick={() => { setCurrentChapterIndex(idx); setCurrentPageIndex(0); }}
                      className="flex items-center justify-between p-3 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-800 cursor-pointer transition"
                    >
                      <div>
                        <span className="font-semibold text-indigo-300">Capítulo {chap.number}</span>
                        {chap.title && <span className="text-gray-400 text-sm ml-2">- {chap.title}</span>}
                      </div>
                      <span className="text-xs text-gray-500">{chap.pages?.length || 0} páginas</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        ) : (
          <div className="space-y-6">
            {(role === 'Admin' || role === 'Scan') && (
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-3">
                <h3 className="text-md font-semibold flex items-center gap-2 text-indigo-400">
                  <Plus className="w-4 h-4" /> Agregar Nueva Serie
                </h3>
                <form onSubmit={handleCreateSeries} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    type="text" placeholder="Título de la obra" value={newSeriesTitle} onChange={e => setNewSeriesTitle(e.target.value)} required
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <input 
                    type="text" placeholder="URL de la portada" value={newSeriesCover} onChange={e => setNewSeriesCover(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <input 
                    type="text" placeholder="Sinopsis / Descripción" value={newSeriesDesc} onChange={e => setNewSeriesDesc(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button type="submit" className="md:col-span-3 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg font-medium text-sm transition">
                    Crear Serie
                  </button>
                </form>
              </div>
            )}

            <h2 className="text-xl font-bold">Catálogo de Obras</h2>

            {seriesList.length === 0 ? (
              <p className="text-sm text-gray-500">No hay series registradas en la biblioteca todavía.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {seriesList.map((s) => (
                  <div 
                    key={s.id} 
                    onClick={() => openSeries(s)}
                    className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/50 cursor-pointer transition group"
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-gray-800">
                      <img src={s.cover_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-white truncate">{s.title}</h3>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">{s.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
