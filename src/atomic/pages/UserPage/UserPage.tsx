import styles from './UserPage.module.scss'
import SwipeButton from '../../molecules/SwipeButton/SwipeButton.tsx'
import { useNavigate } from 'react-router-dom'
import RippleAvatar from '../../molecules/RippleAvatar/RippleAvatar.tsx'

const UserPage = () => {
    const navigate = useNavigate()
    const handleSwipe = () => {
        navigate('/')
    }
    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>
                <RippleAvatar />
            </div>
            <SwipeButton onComplete={handleSwipe} className={styles.btn} />
        </div>
    )
}

export default UserPage
