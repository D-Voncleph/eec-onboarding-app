/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px -5px var(--accent)',
        'glow-sm': '0 0 10px -2px var(--accent)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      colors: {
        primary: 'var(--bgPrimary)',
        secondary: 'var(--bgSecondary)',
        tertiary: 'var(--bgTertiary)',

        'text-primary': 'var(--textPrimary)',
        'text-secondary': 'var(--textSecondary)',
        'text-tertiary': 'var(--textTertiary)',

        accent: 'var(--accent)',
        'accent-secondary': 'var(--accentSecondary)',

        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',

        border: 'var(--border)',
        'border-light': 'var(--borderLight)',

        card: 'var(--cardBg)',
        'card-border': 'var(--cardBorder)',
      }
    },
  },
  plugins: [],
}