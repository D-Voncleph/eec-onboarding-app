import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Define available themes
export const themes = {
    light: {
        name: 'Light',
        previewColors: ['#FFFFFF', '#F3F4F6'],
        bgPrimary: '#FFFFFF',
        bgSecondary: '#F3F4F6',
        bgTertiary: '#E5E7EB',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accent: '#6366F1',
        accentSecondary: '#8B5CF6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        border: '#E5E7EB',
        borderLight: '#F3F4F6',
        cardBg: '#FFFFFF',
        cardBorder: '#E5E7EB',
        shadow: 'rgba(0, 0, 0, 0.1)',
    },
    midnight: {
        name: 'Midnight Blue',
        previewColors: ['#3B82F6', '#60A5FA'],
        bgPrimary: '#0F172A',
        bgSecondary: '#1E293B',
        bgTertiary: '#334155',
        textPrimary: '#F8FAFC',
        textSecondary: '#CBD5E1',
        textTertiary: '#94A3B8',
        accent: '#3B82F6',
        accentSecondary: '#60A5FA',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        border: '#334155',
        borderLight: '#1E293B',
        cardBg: '#1E293B',
        cardBorder: '#334155',
        shadow: 'rgba(0, 0, 0, 0.3)',
    },
    emerald: {
        name: 'Emerald',
        previewColors: ['#10B981', '#34D399'],
        bgPrimary: '#064E3B',
        bgSecondary: '#065F46',
        bgTertiary: '#047857',
        textPrimary: '#ECFDF5',
        textSecondary: '#A7F3D0',
        textTertiary: '#6EE7B7',
        accent: '#10B981',
        accentSecondary: '#34D399',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        border: '#047857',
        borderLight: '#065F46',
        cardBg: '#065F46',
        cardBorder: '#047857',
        shadow: 'rgba(0, 0, 0, 0.3)',
    },
    purple: {
        name: 'Purple Haze',
        previewColors: ['#A855F7', '#C084FC'],
        bgPrimary: '#3B0764',
        bgSecondary: '#581C87',
        bgTertiary: '#6B21A8',
        textPrimary: '#FAF5FF',
        textSecondary: '#E9D5FF',
        textTertiary: '#D8B4FE',
        accent: '#A855F7',
        accentSecondary: '#C084FC',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        border: '#6B21A8',
        borderLight: '#581C87',
        cardBg: '#581C87',
        cardBorder: '#6B21A8',
        shadow: 'rgba(0, 0, 0, 0.3)',
    },
};

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState('light');
    const [loading, setLoading] = useState(true);

    // Load theme from database on mount
    useEffect(() => {
        const loadTheme = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/preferences', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                const data = await response.json();
                if (data.theme) {
                    setCurrentTheme(data.theme);
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTheme();
    }, []);

    // Apply CSS variables whenever theme changes
    useEffect(() => {
        const theme = themes[currentTheme];
        if (!theme) return;

        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
            if (key !== 'name') {
                root.style.setProperty(`--${key}`, value);
            }
        });
    }, [currentTheme]);

    const changeTheme = async (themeName) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const response = await fetch('http://localhost:3000/api/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ theme: themeName })
            });

            if (response.ok) {
                setCurrentTheme(themeName);
            }
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    return (
        <ThemeContext.Provider value={{ currentTheme, changeTheme, themes, loading }}>
            {children}
        </ThemeContext.Provider>
    );
};
