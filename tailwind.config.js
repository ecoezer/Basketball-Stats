/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#0f172a',
          light: '#38bdf8',
        },
        accent: '#f59e0b',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
