import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
    ],

    theme: {
        extend: {
            colors: {
                canvas: '#0b1120',
                surface: '#121d31',
                raised: '#1b2942',
                field: '#0d1728',
                line: '#344560',
                ink: '#edf2ff',
                muted: '#b5c2d9',
                subtle: '#94a5c1',
                accent: '#9db4ff',
                brand: '#4556cf',
                'brand-hover': '#5365dc',
            },
            // Aumenta apenas a tipografia; a escala de espaçamento permanece igual.
            fontSize: {
                xs: ['0.8125rem', { lineHeight: '1.125rem' }],
                sm: ['0.9375rem', { lineHeight: '1.375rem' }],
                base: ['1.0625rem', { lineHeight: '1.625rem' }],
                lg: ['1.1875rem', { lineHeight: '1.75rem' }],
                xl: ['1.3125rem', { lineHeight: '1.875rem' }],
                '2xl': ['1.5625rem', { lineHeight: '2rem' }],
            },
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
        },
    },

    plugins: [forms],
};
