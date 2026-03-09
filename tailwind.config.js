/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Exo 2', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f7fde8',
          100: '#edfcc5',
          200: '#ddf88d',
          300: '#c9f04b',
          400: '#b3e41f',
          500: '#9acc15',
          600: '#81b717',
          700: '#5c8410',
          800: '#4a6812',
          900: '#3e5613',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
