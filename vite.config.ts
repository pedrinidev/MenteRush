/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // El dominio y los repositorios corren en Node; los tests de UI declaran
    // `@vitest-environment jsdom` en su cabecera.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
