import styles from './MainPage.module.scss'
import Button from '../../atoms/Button/Button.tsx'
import { useNavigate } from 'react-router-dom'

const MainPage = () => {
    const navigate = useNavigate()
    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>
                <Button onClick={() => navigate('/operator')}>
                    ВОЙТИ КАК ОПЕРАТОР
                </Button>
                <Button onClick={() => navigate('/user')}>
                    ВОЙТИ КАК ПОЛЬЗОВАТЕЛЬ
                </Button>
            </div>
        </div>
    )
}

export default MainPage
