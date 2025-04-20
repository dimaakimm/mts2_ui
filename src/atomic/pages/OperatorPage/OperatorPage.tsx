import styles from './OperatorPage.module.scss'
import { hints, personalInfo } from '../../../mockedData/mockedData.ts'
import Button from '../../atoms/Button/Button.tsx'
import Typography from '../../atoms/Typography/Typography.tsx'
import { useNavigate } from 'react-router-dom'
import Hint from '../../atoms/Hint/Hint.tsx'

const OperatorPage = () => {
    const navigate = useNavigate()
    //TODO: при завершении звонка пересылать '/results'
    return (
        <div className={styles.wrapper}>
            <div className={styles.left}>
                <div className={styles.leftContent}>
                    {hints.map((hint, index) => (
                        <Hint text={hint.text} type={hint.type} key={index} />
                    ))}
                </div>
            </div>
            <div className={styles.right}>
                <div className={styles.mainInfo}>ИНФОРМАЦИЯ О КЛИЕНТЕ</div>
                <div className={styles.info}>
                    <Typography dType="r20">{personalInfo}</Typography>
                </div>
                <Button onClick={() => navigate('/')}>
                    <Typography dType="r24">На главную</Typography>
                </Button>
            </div>
        </div>
    )
}

export default OperatorPage
