/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        plane: {
          bg: '#0e1117',
          surface: '#161b22',
          border: '#21262d',
          sidebar: '#0d1117',
          accent: '#4f8ef7',
          'accent-hover': '#3a7bd5',
          text: '#e6edf3',
          muted: '#8b949e',
          sent: '#1a4a8a',
          received: '#1c2128',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
