/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        pass: {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: '#10b981',
          text: '#34d399',
          glow: 'rgba(16, 185, 129, 0.4)',
        },
        fail: {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: '#ef4444',
          text: '#f87171',
          glow: 'rgba(239, 68, 68, 0.4)',
        },
        slate: {
          850: '#131b2e',
          950: '#0b0f19',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.4s ease-in-out',
        'glow-pass': 'glowPass 1.5s ease-in-out infinite alternate',
        'glow-fail': 'glowFail 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        glowPass: {
          '0%': { boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.6)' },
        },
        glowFail: {
          '0%': { boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(239, 68, 68, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
