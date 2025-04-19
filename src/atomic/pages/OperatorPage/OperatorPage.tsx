import styles from './OperatorPage.module.scss'
import { hints, personalInfo } from '../../../mockedData/mockedData.ts'
import Button from '../../atoms/Button/Button.tsx'
import Typography from '../../atoms/Typography/Typography.tsx'
import { useNavigate } from 'react-router-dom'

const OperatorPage = () => {
    const navigate = useNavigate()
    return (
        <div className={styles.wrapper}>
            <div className={styles.left}>
                <div className={styles.leftContent}>
                    {hints.map((hint) => (
                        <div className={styles.hint}>{hint.text}</div>
                    ))}
                </div>
            </div>
            <div className={styles.right}>
                <div className={styles.mainInfo}>ИНФОРМАЦИЯ О КЛИЕНТЕ</div>
                <div className={styles.info}>{personalInfo}</div>
                <Button onClick={() => navigate('/')}>
                    <Typography dType="r24">На главную</Typography>
                </Button>
            </div>
        </div>
    )
}

export default OperatorPage
