import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {gameDataPlugin} from "./src/vite-plugins/gameDataPlugin.ts";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(), // Görsel motoru Vite'e bağladık
        gameDataPlugin(),
    ],
    server: {
        sourcemap: true, // Geliştirme sunucusunda kaynak haritalarını zorunlu kılın
        port: 5173       // Kullandığınız portun doğru olduğundan emin olun
    },
    build: {
        sourcemap: true  // Gerekirse build süreçleri için de aktif edin
    },
    base: './',
})