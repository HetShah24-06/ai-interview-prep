import React from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../../../theme/theme.context'
import './navbar.scss'

const Navbar = () => {
    const { user, handleLogout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()

    const onLogout = async () => {
        await handleLogout()
        navigate('/login')
    }

    return (
        <header className='navbar'>
            <Link to='/' className='navbar__brand'>Interview Master</Link>
            <div className='navbar__actions'>
                <button
                    onClick={toggleTheme}
                    className='navbar__theme-toggle'
                    aria-label='Toggle light/dark theme'
                    title='Toggle theme'
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                {user && <Link to='/profile' className='navbar__user'>{user.username}</Link>}
                <button onClick={onLogout} className='button primary-button navbar__logout'>Logout</button>
            </div>
        </header>
    )
}

export default Navbar
