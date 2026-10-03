import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem('theme') || 'dark'
}

export const ThemeProvider = ({ children }) => {
    const [ theme, setTheme ] = useState(getInitialTheme)

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [ theme ])

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }

    return context
}
